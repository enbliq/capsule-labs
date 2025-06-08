import { Injectable } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { DreamCapsule, DreamCapsuleStatus } from "../entities/dream-capsule.entity"
import { DreamCapsuleInteractionLog, DreamInteractionType } from "../entities/dream-capsule-interaction-log.entity"
import { Logger } from "@nestjs/common"
import { LessThan } from "typeorm"

@Injectable()
export class DreamCapsuleMaintenance {
  private readonly logger = new Logger(DreamCapsuleMaintenance.name);

  constructor(
    @InjectRepository(DreamCapsule)
    private dreamCapsuleRepository: Repository<DreamCapsule>,
    @InjectRepository(DreamCapsuleInteractionLog)
    private interactionLogRepository: Repository<DreamCapsuleInteractionLog>,
  ) {}

  /**
   * Check for expired capsules daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredCapsules() {
    this.logger.log("Checking for expired dream capsules")

    try {
      const now = new Date()

      // Find capsules that have expired
      const expiredCapsules = await this.dreamCapsuleRepository.find({
        where: {
          status: DreamCapsuleStatus.LOCKED,
          expiresAt: LessThan(now),
        },
      })

      this.logger.log(`Found ${expiredCapsules.length} expired dream capsules`)

      // Update status and log expiration
      for (const capsule of expiredCapsules) {
        capsule.status = DreamCapsuleStatus.EXPIRED
        await this.dreamCapsuleRepository.save(capsule)

        // Log expiration
        await this.logInteraction(capsule.userId, capsule.id, DreamInteractionType.EXPIRED, {
          expiredAt: now,
          originalExpiryDate: capsule.expiresAt,
        })

        this.logger.log(`Marked capsule ${capsule.id} as expired`)
      }
    } catch (error) {
      this.logger.error("Error checking expired dream capsules:", error.stack)
    }
  }

  /**
   * Clean up old interaction logs to prevent database bloat
   * Runs monthly to remove logs older than 1 year
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupOldLogs() {
    this.logger.log("Starting monthly dream capsule log cleanup")

    try {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const result = await this.interactionLogRepository
        .createQueryBuilder()
        .delete()
        .where("timestamp < :date", { date: oneYearAgo })
        .execute()

      this.logger.log(`Cleaned up ${result.affected} old dream capsule interaction logs`)
    } catch (error) {
      this.logger.error("Error during dream capsule log cleanup:", error.stack)
    }
  }

  private async logInteraction(
    userId: string,
    capsuleId: string,
    type: DreamInteractionType,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const log = this.interactionLogRepository.create({
      userId,
      capsuleId,
      type,
      metadata,
    })

    await this.interactionLogRepository.save(log)
  }
}
