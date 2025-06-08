import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { PolaroidCapsule, PolaroidCapsuleStatus } from "../entities/polaroid-capsule.entity"
import {
  PolaroidCapsuleInteractionLog,
  PolaroidInteractionType,
} from "../entities/polaroid-capsule-interaction-log.entity"
import { SubmissionStatus } from "../entities/photo-submission.entity"
import type { CreatePolaroidCapsuleDto } from "../dto/create-polaroid-capsule.dto"
import type { SubmitPhotoDto } from "../dto/submit-photo.dto"
import type {
  PolaroidCapsuleResponseDto,
  SubmitPhotoResponseDto,
  DailyThemeResponseDto,
  PhotoSubmissionResponseDto,
} from "../dto/polaroid-capsule-response.dto"
import type { ThemeService } from "./theme.service"
import type { PhotoSubmissionService } from "./photo-submission.service"

@Injectable()
export class PolaroidCapsuleService {
  private polaroidCapsuleRepository: Repository<PolaroidCapsule>
  private interactionLogRepository: Repository<PolaroidCapsuleInteractionLog>

  constructor(
    @InjectRepository(PolaroidCapsule)
    polaroidCapsuleRepository: Repository<PolaroidCapsule>,
    @InjectRepository(PolaroidCapsuleInteractionLog)
    interactionLogRepository: Repository<PolaroidCapsuleInteractionLog>,
    private themeService: ThemeService,
    private photoSubmissionService: PhotoSubmissionService,
  ) {
    this.polaroidCapsuleRepository = polaroidCapsuleRepository
    this.interactionLogRepository = interactionLogRepository
  }

  async createCapsule(createCapsuleDto: CreatePolaroidCapsuleDto): Promise<PolaroidCapsuleResponseDto> {
    const capsule = this.polaroidCapsuleRepository.create({
      ...createCapsuleDto,
      validationMethod: createCapsuleDto.validationMethod || "manual",
      confidenceThreshold: createCapsuleDto.confidenceThreshold || 0.7,
      expiresAt: createCapsuleDto.expiresAt ? new Date(createCapsuleDto.expiresAt) : null,
    })

    const savedCapsule = await this.polaroidCapsuleRepository.save(capsule)

    // Log the creation
    await this.logInteraction(savedCapsule.userId, savedCapsule.id, PolaroidInteractionType.CREATED, {
      capsuleType: savedCapsule.type,
      validationMethod: savedCapsule.validationMethod,
    })

    return this.mapToResponseDto(savedCapsule)
  }

  async getCapsuleById(id: string, userId: string): Promise<PolaroidCapsuleResponseDto> {
    const capsule = await this.polaroidCapsuleRepository.findOne({
      where: { id, userId },
    })

    if (!capsule) {
      throw new NotFoundException("Polaroid capsule not found")
    }

    // Log the view
    await this.logInteraction(userId, id, PolaroidInteractionType.VIEWED)

    return this.mapToResponseDto(capsule)
  }

  async getUserCapsules(userId: string): Promise<PolaroidCapsuleResponseDto[]> {
    const capsules = await this.polaroidCapsuleRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    })

    const results: PolaroidCapsuleResponseDto[] = []

    for (const capsule of capsules) {
      results.push(await this.mapToResponseDto(capsule))
    }

    return results
  }

  async submitPhoto(userId: string, submitPhotoDto: SubmitPhotoDto): Promise<SubmitPhotoResponseDto> {
    try {
      // Submit the photo
      const submission = await this.photoSubmissionService.submitPhoto(userId, submitPhotoDto)

      // Get today's theme
      const dailyTheme = await this.themeService.getDailyTheme(userId)

      // Log the submission
      await this.logInteraction(userId, null, PolaroidInteractionType.PHOTO_SUBMITTED, {
        submissionId: submission.id,
        themeId: dailyTheme.themeId,
      })

      let capsuleUnlocked = false
      let unlockedCapsule: PolaroidCapsule | null = null

      // If submission was auto-approved, check for capsules to unlock
      if (submission.status === SubmissionStatus.APPROVED) {
        // Get all user's locked polaroid capsules
        const capsules = await this.polaroidCapsuleRepository.find({
          where: { userId, status: PolaroidCapsuleStatus.LOCKED },
        })

        // Check each capsule to see if it can be unlocked
        for (const capsule of capsules) {
          // For automatic validation, check if confidence score meets threshold
          if (
            (capsule.validationMethod === "automatic" || capsule.validationMethod === "hybrid") &&
            submission.confidenceScore &&
            submission.confidenceScore >= capsule.confidenceThreshold
          ) {
            await this.unlockCapsule(capsule, submission.id)
            capsuleUnlocked = true
            unlockedCapsule = capsule

            // Log the approval
            await this.logInteraction(userId, capsule.id, PolaroidInteractionType.PHOTO_APPROVED, {
              submissionId: submission.id,
              confidenceScore: submission.confidenceScore,
            })
          }
        }
      }

      // Prepare response
      const response: SubmitPhotoResponseDto = {
        success: true,
        message: capsuleUnlocked
          ? "Photo submitted successfully and capsule unlocked!"
          : submission.status === SubmissionStatus.APPROVED
            ? "Photo approved automatically but no capsules were unlocked."
            : "Photo submitted successfully and pending review.",
        submission: this.mapSubmissionToResponseDto(submission, dailyTheme),
        capsuleUnlocked,
      }

      if (unlockedCapsule) {
        response.unlockedCapsule = await this.mapToResponseDto(unlockedCapsule)
      }

      return response
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException("Failed to submit photo")
    }
  }

  async reviewSubmission(
    submissionId: string,
    status: SubmissionStatus,
    reviewedBy: string,
    rejectionReason?: string,
  ): Promise<{ submission: any; unlockedCapsules: PolaroidCapsule[] }> {
    // Review the submission
    const submission = await this.photoSubmissionService.reviewSubmission(submissionId, {
      status,
      reviewedBy,
      rejectionReason,
    })

    const unlockedCapsules: PolaroidCapsule[] = []

    // If approved, check for capsules to unlock
    if (status === SubmissionStatus.APPROVED) {
      // Get all user's locked polaroid capsules
      const capsules = await this.polaroidCapsuleRepository.find({
        where: { userId: submission.userId, status: PolaroidCapsuleStatus.LOCKED },
      })

      // Unlock all capsules that use manual validation
      for (const capsule of capsules) {
        if (capsule.validationMethod === "manual" || capsule.validationMethod === "hybrid") {
          await this.unlockCapsule(capsule, submissionId)
          unlockedCapsules.push(capsule)

          // Log the approval
          await this.logInteraction(submission.userId, capsule.id, PolaroidInteractionType.PHOTO_APPROVED, {
            submissionId,
            reviewedBy,
          })
        }
      }
    } else if (status === SubmissionStatus.REJECTED) {
      // Log the rejection for all capsules
      const capsules = await this.polaroidCapsuleRepository.find({
        where: { userId: submission.userId, status: PolaroidCapsuleStatus.LOCKED },
      })

      for (const capsule of capsules) {
        await this.logInteraction(submission.userId, capsule.id, PolaroidInteractionType.PHOTO_REJECTED, {
          submissionId,
          reviewedBy,
          rejectionReason,
        })
      }
    }

    return { submission, unlockedCapsules }
  }

  private async unlockCapsule(capsule: PolaroidCapsule, submissionId: string): Promise<void> {
    capsule.status = PolaroidCapsuleStatus.UNLOCKED
    capsule.unlockedAt = new Date()
    capsule.unlockedBySubmissionId = submissionId
    await this.polaroidCapsuleRepository.save(capsule)

    // Log the unlock
    await this.logInteraction(capsule.userId, capsule.id, PolaroidInteractionType.UNLOCKED, {
      submissionId,
    })
  }

  private async logInteraction(
    userId: string,
    capsuleId: string | null,
    type: PolaroidInteractionType,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const log = this.interactionLogRepository.create({
      userId,
      capsuleId,
      type,
      themeId: metadata?.themeId,
      submissionId: metadata?.submissionId,
      metadata,
    })

    await this.interactionLogRepository.save(log)
  }

  private async mapToResponseDto(capsule: PolaroidCapsule): Promise<PolaroidCapsuleResponseDto> {
    // Get today's theme for the user
    let todaysTheme = null
    let todaysSubmission = null

    try {
      const dailyTheme = await this.themeService.getDailyTheme(capsule.userId)
      todaysTheme = this.mapThemeToResponseDto(dailyTheme)

      // Get today's submission if it exists
      const submission = await this.photoSubmissionService.getTodaysSubmission(capsule.userId)
      if (submission) {
        todaysSubmission = this.mapSubmissionToResponseDto(submission, dailyTheme)
      }
    } catch (error) {
      console.error("Error fetching today's theme or submission:", error)
    }

    return {
      id: capsule.id,
      title: capsule.title,
      description: capsule.description,
      content: capsule.status === PolaroidCapsuleStatus.UNLOCKED ? capsule.content : undefined,
      type: capsule.type,
      status: capsule.status,
      userId: capsule.userId,
      validationMethod: capsule.validationMethod,
      confidenceThreshold: capsule.confidenceThreshold,
      unlockedBySubmissionId: capsule.unlockedBySubmissionId,
      unlockedAt: capsule.unlockedAt,
      expiresAt: capsule.expiresAt,
      metadata: capsule.metadata,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
      todaysTheme,
      todaysSubmission,
    }
  }

  private mapThemeToResponseDto(dailyTheme: any): DailyThemeResponseDto {
    return {
      id: dailyTheme.id,
      date: dailyTheme.date,
      theme: {
        id: dailyTheme.theme.id,
        name: dailyTheme.theme.name,
        description: dailyTheme.theme.description,
        category: dailyTheme.theme.category,
        keywords: dailyTheme.theme.keywords,
      },
    }
  }

  private mapSubmissionToResponseDto(submission: any, dailyTheme: any): PhotoSubmissionResponseDto {
    return {
      id: submission.id,
      photoUrl: submission.photoUrl,
      thumbnailUrl: submission.thumbnailUrl,
      caption: submission.caption,
      status: submission.status,
      confidenceScore: submission.confidenceScore,
      rejectionReason: submission.rejectionReason,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      dailyTheme: this.mapThemeToResponseDto(dailyTheme),
    }
  }
}
