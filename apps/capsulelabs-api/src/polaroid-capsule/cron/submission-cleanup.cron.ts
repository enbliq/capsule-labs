import { Injectable, Inject } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import type { Repository } from "typeorm"
import { type PhotoSubmission, SubmissionStatus } from "../entities/photo-submission.entity"
import { type PolaroidCapsule, PolaroidCapsuleStatus } from "../entities/polaroid-capsule.entity"
import {
  type PolaroidCapsuleInteractionLog,
  PolaroidInteractionType,
} from "../entities/polaroid-capsule-interaction-log.entity"
import { Logger } from "@nestjs/common"
import { LessThan } from "typeorm"

@Injectable()
export class SubmissionCleanupCron {
  private readonly logger = new Logger(SubmissionCleanupCron.name);

  constructor(
    @Inject("PHOTO_SUBMISSION_REPOSITORY")
    private photoSubmissionRepository: Repository<PhotoSubmission>,
    @Inject("POLAROID_CAPSULE_REPOSITORY")
    private polaroidCapsuleRepository: Repository<PolaroidCapsule>,
    @Inject("POLAROID_CAPSULE_INTERACTION_LOG_REPOSITORY")
    private interactionLogRepository: Repository<PolaroidCapsuleInteractionLog>,
  ) {}

  /**
   * Auto-reject submissions that have been pending for too long
   * This prevents submissions from staying in pending state indefinitely
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async autoRejectOldPendingSubmissions() {
    this.logger.log("Checking for old pending submissions to auto-reject")

    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const oldPendingSubmissions = await this.photoSubmissionRepository.find({
        where: {
          status: SubmissionStatus.PENDING,
          submittedAt: LessThan(sevenDaysAgo),
        },
      })

      this.logger.log(`Found ${oldPendingSubmissions.length} old pending submissions`)

      for (const submission of oldPendingSubmissions) {
        submission.status = SubmissionStatus.REJECTED
        submission.rejectionReason = "Auto-rejected due to timeout (7 days without review)"
        submission.reviewedBy = "system"
        submission.reviewedAt = new Date()

        await this.photoSubmissionRepository.save(submission)

        // Log the auto-rejection
        await this.logInteraction(submission.userId, null, PolaroidInteractionType.PHOTO_REJECTED, {
          submissionId: submission.id,
          reason: "auto_timeout",
          reviewedBy: "system",
        })

        this.logger.log(`Auto-rejected submission ${submission.id}`)
      }
    } catch (error) {
      this.logger.error("Error auto-rejecting old pending submissions:", error.stack)
    }
  }

  /**
   * Check for expired capsules and mark them as expired
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredCapsules() {
    this.logger.log("Checking for expired polaroid capsules")

    try {
      const now = new Date()

      const expiredCapsules = await this.polaroidCapsuleRepository.find({
        where: {
          status: PolaroidCapsuleStatus.LOCKED,
          expiresAt: LessThan(now),
        },
      })

      this.logger.log(`Found ${expiredCapsules.length} expired polaroid capsules`)

      for (const capsule of expiredCapsules) {
        capsule.status = PolaroidCapsuleStatus.EXPIRED
        await this.polaroidCapsuleRepository.save(capsule)

        // Log expiration
        await this.logInteraction(capsule.userId, capsule.id, PolaroidInteractionType.EXPIRED, {
          expiredAt: now,
          originalExpiryDate: capsule.expiresAt,
        })

        this.logger.log(`Marked capsule ${capsule.id} as expired`)
      }
    } catch (error) {
      this.logger.error("Error checking expired polaroid capsules:", error.stack)
    }
  }

  /**
   * Clean up old interaction logs to prevent database bloat
   * Runs monthly to remove logs older than 1 year
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupOldLogs() {
    this.logger.log("Starting monthly polaroid capsule log cleanup")

    try {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const result = await this.interactionLogRepository
        .createQueryBuilder()
        .delete()
        .where("timestamp < :date", { date: oneYearAgo })
        .execute()

      this.logger.log(`Cleaned up ${result.affected} old polaroid capsule interaction logs`)
    } catch (error) {
      this.logger.error("Error during polaroid capsule log cleanup:", error.stack)
    }
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
      submissionId: metadata?.submissionId,
      metadata,
    })

    await this.interactionLogRepository.save(log)
  }
}
