import { Injectable, Logger } from "@nestjs/common"
import { PetType } from "../dto/pet-upload.dto"

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  async sendCapsuleUnlockedNotification(userId: string, petType: PetType): Promise<void> {
    this.logger.log(`Sending capsule unlocked notification to user ${userId} for ${petType}`)

    const petEmojis = {
      [PetType.DOG]: "🐶",
      [PetType.CAT]: "🐱",
      [PetType.BIRD]: "🐦",
      [PetType.RABBIT]: "🐰",
      [PetType.HAMSTER]: "🐹",
      [PetType.FISH]: "🐠",
      [PetType.REPTILE]: "🦎",
      [PetType.OTHER]: "🐾",
    }

    const notification = {
      title: `${petEmojis[petType]} Pet Capsule Unlocked!`,
      body: `Congratulations! Your ${petType} photo has been verified and the Pet Capsule is now unlocked!`,
      data: {
        type: "capsule_unlocked",
        capsuleType: "pet",
        petType,
        timestamp: new Date().toISOString(),
      },
    }

    this.logger.log(`[MOCK] Pet capsule unlocked notification:`, notification)
  }

  async sendManualReviewNotification(userId: string, uploadId: string): Promise<void> {
    const notification = {
      title: "🔍 Photo Under Review",
      body: "Your pet photo is being reviewed by our team. You'll be notified once the review is complete!",
      data: {
        type: "manual_review_started",
        uploadId,
      },
    }

    this.logger.log(`[MOCK] Manual review notification:`, notification)
  }

  async sendApprovalNotification(userId: string, uploadId: string): Promise<void> {
    const notification = {
      title: "✅ Photo Approved!",
      body: "Great news! Your pet photo has been approved and the Pet Capsule is unlocked!",
      data: {
        type: "photo_approved",
        uploadId,
      },
    }

    this.logger.log(`[MOCK] Photo approval notification:`, notification)
  }

  async sendRejectionNotification(userId: string, uploadId: string, reason?: string): Promise<void> {
    const notification = {
      title: "❌ Photo Not Approved",
      body:
        reason ||
        "Your photo couldn't be verified as containing a recognizable pet. Please try uploading a clearer photo!",
      data: {
        type: "photo_rejected",
        uploadId,
        reason,
      },
    }

    this.logger.log(`[MOCK] Photo rejection notification:`, notification)
  }

  async sendProcessingNotification(userId: string, uploadId: string): Promise<void> {
    const notification = {
      title: "🔄 Processing Your Photo",
      body: "We're analyzing your pet photo using our AI system. This usually takes just a few seconds!",
      data: {
        type: "photo_processing",
        uploadId,
      },
    }

    this.logger.log(`[MOCK] Photo processing notification:`, notification)
  }

  async sendUploadSuccessNotification(userId: string, uploadId: string): Promise<void> {
    const notification = {
      title: "📸 Photo Uploaded Successfully",
      body: "Your pet photo has been uploaded and is now being processed. You'll hear from us soon!",
      data: {
        type: "upload_success",
        uploadId,
      },
    }

    this.logger.log(`[MOCK] Upload success notification:`, notification)
  }

  async sendReviewerNotification(reviewerId: string, uploadId: string, petType?: PetType): Promise<void> {
    const notification = {
      title: "👀 New Photo to Review",
      body: `A new ${petType || "pet"} photo needs manual verification. Please review when you have a moment.`,
      data: {
        type: "reviewer_assignment",
        uploadId,
        petType,
      },
    }

    this.logger.log(`[MOCK] Reviewer notification:`, notification)
  }

  async sendHighVolumeAlert(pendingCount: number): Promise<void> {
    const notification = {
      title: "⚠️ High Review Volume",
      body: `There are ${pendingCount} photos pending manual review. Consider adding more reviewers.`,
      data: {
        type: "high_volume_alert",
        pendingCount,
      },
    }

    this.logger.log(`[MOCK] High volume alert:`, notification)
  }
}
