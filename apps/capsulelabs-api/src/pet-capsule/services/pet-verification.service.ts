import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { PetUpload, PetClassification, ManualVerification, PetCapsuleUnlock } from "../entities/pet-upload.entity"
import { type PetType, VerificationStatus } from "../dto/pet-upload.dto"
import type { MLClassifierService } from "./ml-classifier.service"
import type { NotificationService } from "./notification.service"

@Injectable()
export class PetVerificationService {
  private readonly logger = new Logger(PetVerificationService.name);

  constructor(
    private uploadRepository: Repository<PetUpload>,
    private classificationRepository: Repository<PetClassification>,
    private verificationRepository: Repository<ManualVerification>,
    private unlockRepository: Repository<PetCapsuleUnlock>,
    private mlClassifierService: MLClassifierService,
    private notificationService: NotificationService,
    @InjectRepository(PetUpload)
    private readonly petUploadRepository: Repository<PetUpload>,
    @InjectRepository(PetClassification)
    private readonly petClassificationRepository: Repository<PetClassification>,
    @InjectRepository(ManualVerification)
    private readonly manualVerificationRepository: Repository<ManualVerification>,
    @InjectRepository(PetCapsuleUnlock)
    private readonly petCapsuleUnlockRepository: Repository<PetCapsuleUnlock>,
  ) {}

  async processUpload(
    upload: PetUpload,
    processedImagePath: string,
  ): Promise<{
    classification: PetClassification
    needsManualReview: boolean
    capsuleUnlocked: boolean
  }> {
    try {
      // Run ML classification
      const classificationResult = await this.mlClassifierService.classifyPet(processedImagePath)

      // Save classification results
      const classification = this.classificationRepository.create({
        uploadId: upload.id,
        predictedPetType: classificationResult.predictedPetType,
        confidence: classificationResult.confidence,
        allPredictions: classificationResult.allPredictions,
        processingTimeMs: classificationResult.processingTimeMs,
        modelVersion: classificationResult.modelVersion,
        modelProvider: classificationResult.modelProvider,
        technicalDetails: {
          imagePreprocessing: "resize_224x224_normalize",
          modelInputs: { imageSize: "224x224x3" },
        },
      })

      await this.classificationRepository.save(classification)

      // Determine if manual review is needed
      const needsManualReview = this.mlClassifierService.needsManualReview(classificationResult.allPredictions)

      let capsuleUnlocked = false

      if (!needsManualReview && this.mlClassifierService.isHighConfidence(classificationResult.confidence)) {
        // Auto-approve high confidence predictions
        upload.verificationStatus = VerificationStatus.APPROVED
        capsuleUnlocked = await this.unlockCapsule(upload, classification, "auto_ml")
      } else {
        // Mark for manual review
        upload.verificationStatus = VerificationStatus.NEEDS_REVIEW
        await this.notificationService.sendManualReviewNotification(upload.userId, upload.id)
      }

      await this.uploadRepository.save(upload)

      this.logger.log(
        `Processed upload ${upload.id}: ${classificationResult.predictedPetType} (${(classificationResult.confidence * 100).toFixed(1)}%) - ${needsManualReview ? "Needs review" : "Auto-approved"}`,
      )

      return {
        classification,
        needsManualReview,
        capsuleUnlocked,
      }
    } catch (error) {
      this.logger.error(`Error processing upload ${upload.id}:`, error)

      // Mark upload as needing review on error
      upload.verificationStatus = VerificationStatus.NEEDS_REVIEW
      await this.uploadRepository.save(upload)

      throw new BadRequestException("Failed to process pet image")
    }
  }

  async performManualVerification(
    uploadId: string,
    reviewerId: string,
    decision: VerificationStatus,
    reviewNotes?: string,
    correctedPetType?: PetType,
    confidenceOverride?: number,
  ): Promise<{
    verification: ManualVerification
    capsuleUnlocked: boolean
  }> {
    const upload = await this.uploadRepository.findOne({
      where: { id: uploadId },
    })

    if (!upload) {
      throw new NotFoundException("Upload not found")
    }

    if (upload.verificationStatus === VerificationStatus.APPROVED) {
      throw new BadRequestException("Upload has already been approved")
    }

    const reviewStartTime = Date.now()

    // Create verification record
    const verification = this.verificationRepository.create({
      uploadId,
      reviewerId,
      decision,
      reviewNotes,
      correctedPetType,
      confidenceOverride,
      reviewTimeSeconds: Math.floor((Date.now() - reviewStartTime) / 1000),
      reviewMetadata: {
        reviewDifficulty: this.assessReviewDifficulty(upload),
      },
    })

    await this.verificationRepository.save(verification)

    // Update upload status
    upload.verificationStatus = decision
    await this.uploadRepository.save(upload)

    let capsuleUnlocked = false

    if (decision === VerificationStatus.APPROVED) {
      // Get classification for unlock
      const classification = await this.classificationRepository.findOne({
        where: { uploadId, isActive: true },
        order: { createdAt: "DESC" },
      })

      if (classification) {
        capsuleUnlocked = await this.unlockCapsule(upload, classification, "manual_verification", verification.id)
      }

      await this.notificationService.sendApprovalNotification(upload.userId, upload.id)
    } else if (decision === VerificationStatus.REJECTED) {
      await this.notificationService.sendRejectionNotification(upload.userId, upload.id, reviewNotes)
    }

    this.logger.log(`Manual verification completed for upload ${uploadId}: ${decision}`)

    return {
      verification,
      capsuleUnlocked,
    }
  }

  private async unlockCapsule(
    upload: PetUpload,
    classification: PetClassification,
    unlockMethod: string,
    verificationId?: string,
  ): Promise<boolean> {
    try {
      // Check if user already has an unlock (prevent duplicates)
      const existingUnlock = await this.unlockRepository.findOne({
        where: { userId: upload.userId },
      })

      if (existingUnlock) {
        this.logger.log(`User ${upload.userId} already has pet capsule unlocked`)
        return false
      }

      // Create unlock record
      const unlock = this.unlockRepository.create({
        userId: upload.userId,
        uploadId: upload.id,
        petType: classification.predictedPetType,
        finalConfidence: classification.confidence,
        unlockMethod,
        unlockedAt: new Date(),
        unlockDetails: {
          classificationId: classification.id,
          verificationId,
          processingTime: classification.processingTimeMs,
        },
      })

      await this.unlockRepository.save(unlock)

      // Update upload record
      upload.capsuleUnlocked = true
      upload.capsuleUnlockedAt = new Date()
      await this.uploadRepository.save(upload)

      // Send notification
      await this.notificationService.sendCapsuleUnlockedNotification(upload.userId, classification.predictedPetType)

      this.logger.log(`🎉 Pet Capsule unlocked for user ${upload.userId} with ${classification.predictedPetType}!`)

      return true
    } catch (error) {
      this.logger.error(`Error unlocking capsule for user ${upload.userId}:`, error)
      return false
    }
  }

  private assessReviewDifficulty(upload: PetUpload): number {
    // Simple difficulty assessment (1-5 scale)
    let difficulty = 1

    // Larger images might be easier to review
    if (upload.imageWidth && upload.imageHeight) {
      const totalPixels = upload.imageWidth * upload.imageHeight
      if (totalPixels < 100000) difficulty += 1 // Small image
    }

    // File size might indicate quality
    if (upload.fileSize < 100000) difficulty += 1 // Very small file

    return Math.min(difficulty, 5)
  }

  async getUploadWithDetails(uploadId: string): Promise<{
    upload: PetUpload
    classification: PetClassification | null
    verification: ManualVerification | null
    unlock: PetCapsuleUnlock | null
  }> {
    const upload = await this.uploadRepository.findOne({
      where: { id: uploadId },
    })

    if (!upload) {
      throw new NotFoundException("Upload not found")
    }

    const classification = await this.classificationRepository.findOne({
      where: { uploadId, isActive: true },
      order: { createdAt: "DESC" },
    })

    const verification = await this.verificationRepository.findOne({
      where: { uploadId },
      order: { createdAt: "DESC" },
    })

    const unlock = await this.unlockRepository.findOne({
      where: { uploadId },
    })

    return {
      upload,
      classification,
      verification,
      unlock,
    }
  }

  async getUserUploads(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{
    uploads: PetUpload[]
    total: number
    hasUnlock: boolean
  }> {
    const [uploads, total] = await this.uploadRepository.findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    })

    const unlock = await this.unlockRepository.findOne({
      where: { userId },
    })

    return {
      uploads,
      total,
      hasUnlock: !!unlock,
    }
  }

  async getPendingReviews(limit = 50): Promise<{
    uploads: Array<{
      upload: PetUpload
      classification: PetClassification | null
      waitingTime: number
    }>
    total: number
  }> {
    const uploads = await this.uploadRepository.find({
      where: { verificationStatus: VerificationStatus.NEEDS_REVIEW },
      order: { createdAt: "ASC" },
      take: limit,
    })

    const uploadsWithDetails = await Promise.all(
      uploads.map(async (upload) => {
        const classification = await this.classificationRepository.findOne({
          where: { uploadId: upload.id, isActive: true },
          order: { createdAt: "DESC" },
        })

        const waitingTime = Math.floor((Date.now() - upload.createdAt.getTime()) / (1000 * 60)) // minutes

        return {
          upload,
          classification,
          waitingTime,
        }
      }),
    )

    const total = await this.uploadRepository.count({
      where: { verificationStatus: VerificationStatus.NEEDS_REVIEW },
    })

    return {
      uploads: uploadsWithDetails,
      total,
    }
  }

  async getVerificationStats(): Promise<{
    totalUploads: number
    pendingReviews: number
    approvedUploads: number
    rejectedUploads: number
    autoApprovedRate: number
    averageProcessingTime: number
    petTypeDistribution: Record<PetType, number>
  }> {
    const totalUploads = await this.uploadRepository.count()
    const pendingReviews = await this.uploadRepository.count({
      where: { verificationStatus: VerificationStatus.NEEDS_REVIEW },
    })
    const approvedUploads = await this.uploadRepository.count({
      where: { verificationStatus: VerificationStatus.APPROVED },
    })
    const rejectedUploads = await this.uploadRepository.count({
      where: { verificationStatus: VerificationStatus.REJECTED },
    })

    // Calculate auto-approval rate
    const manualVerifications = await this.verificationRepository.count()
    const autoApprovedRate = totalUploads > 0 ? ((totalUploads - manualVerifications) / totalUploads) * 100 : 0

    // Calculate average processing time
    const classifications = await this.classificationRepository.find({
      select: ["processingTimeMs"],
    })
    const averageProcessingTime =
      classifications.length > 0
        ? classifications.reduce((sum, c) => sum + c.processingTimeMs, 0) / classifications.length
        : 0

    // Get pet type distribution
    const unlocks = await this.unlockRepository.find({
      select: ["petType"],
    })
    const petTypeDistribution = unlocks.reduce(
      (acc, unlock) => {
        acc[unlock.petType] = (acc[unlock.petType] || 0) + 1
        return acc
      },
      {} as Record<PetType, number>,
    )

    return {
      totalUploads,
      pendingReviews,
      approvedUploads,
      rejectedUploads,
      autoApprovedRate: Math.round(autoApprovedRate * 100) / 100,
      averageProcessingTime: Math.round(averageProcessingTime),
      petTypeDistribution,
    }
  }
}
