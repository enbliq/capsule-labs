import { Injectable } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import type { Repository } from "typeorm"
import { type StreakCapsule, StreakCapsuleStatus } from "../entities/streak-capsule.entity"
import {
  type StreakCapsuleInteractionLog,
  StreakInteractionType,
} from "../entities/streak-capsule-interaction-log.entity"
import type { StreakCalculationService } from "../services/streak-calculation.service"
import { Logger } from "@nestjs/common"

@Injectable()
export class StreakMaintenanceCron {
  private readonly logger = new Logger(StreakMaintenanceCron.name)

  constructor(
    private streakCalculationService: StreakCalculationService,
    private streakCapsuleRepository: Repository<StreakCapsule>,
    private interactionLogRepository: Repository<StreakCapsuleInteractionLog>,
  ) {}

  /**
   * Check all active streak capsules daily to update streak status
   * This ensures that broken streaks are detected and logged
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateAllStreakStatuses() {
    this.logger.log("Starting daily streak status update")

    try {
      // Get all locked streak capsules
      const capsules = await this.streakCapsuleRepository.find({
        where: { status: StreakCapsuleStatus.LOCKED },
      })

      this.logger.log(`Found ${capsules.length} locked streak capsules to check`)

      for (const capsule of capsules) {
        try {
          const streakUpdate = await this.streakCalculationService.updateCapsuleStreak(capsule)

          // Check if streak was broken
          if (streakUpdate.isStreakBroken) {
            // Log the broken streak
            await this.logInteraction(capsule.userId, capsule.id, StreakInteractionType.STREAK_BROKEN, {
              previousStreak: capsule.currentStreak,
              newStreak: streakUpdate.currentStreak,
              brokenAt: new Date(),
            })

            this.logger.log(`Streak broken for capsule ${capsule.id}, user ${capsule.userId}`)
          }

          // Update capsule data
          capsule.currentStreak = streakUpdate.currentStreak
          capsule.longestStreak = streakUpdate.longestStreak
          capsule.totalCheckIns = streakUpdate.totalCheckIns

          // Reset streak start date if streak is broken
          if (streakUpdate.currentStreak === 0) {
            capsule.streakStartDate = null
          }

          await this.streakCapsuleRepository.save(capsule)
        } catch (error) {
          this.logger.error(`Error updating streak for capsule ${capsule.id}:`, error.stack)
        }
      }

      this.logger.log("Successfully completed daily streak status update")
    } catch (error) {
      this.logger.error("Error during daily streak status update:", error.stack)
    }
  }

  /**
   * Clean up old interaction logs to prevent database bloat
   * Runs weekly to remove logs older than 1 year
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldLogs() {
    this.logger.log("Starting weekly log cleanup")

    try {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const result = await this.interactionLogRepository
        .createQueryBuilder()
        .delete()
        .where("timestamp < :date", { date: oneYearAgo })
        .execute()

      this.logger.log(`Cleaned up ${result.affected} old interaction logs`)
    } catch (error) {
      this.logger.error("Error during log cleanup:", error.stack)
    }
  }

  private async logInteraction(
    userId: string,
    capsuleId: string,
    type: StreakInteractionType,
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
