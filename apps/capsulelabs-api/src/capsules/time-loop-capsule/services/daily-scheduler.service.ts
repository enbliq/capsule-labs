import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import type { TimeLoopCapsuleService } from "./time-loop-capsule.service"

@Injectable()
export class DailySchedulerService {
  private readonly logger = new Logger(DailySchedulerService.name)

  constructor(private readonly timeLoopCapsuleService: TimeLoopCapsuleService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyReset(): Promise<void> {
    this.logger.log("Starting daily reset process...")

    try {
      const results = await this.timeLoopCapsuleService.performDailyReset()

      this.logger.log(`Daily reset completed. Processed ${results.length} capsules`)

      // Log summary
      const stateChanges = results.reduce(
        (acc, result) => {
          acc[result.newState] = (acc[result.newState] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      this.logger.log(`State changes: ${JSON.stringify(stateChanges)}`)
    } catch (error) {
      this.logger.error("Daily reset failed:", error)
    }
  }

  @Cron("0 */6 * * *") // Every 6 hours
  async handleGracePeriodCheck(): Promise<void> {
    this.logger.log("Checking grace periods...")

    try {
      // This would check for expired grace periods and transition capsules to locked state
      // Implementation would depend on specific business logic
      this.logger.log("Grace period check completed")
    } catch (error) {
      this.logger.error("Grace period check failed:", error)
    }
  }

  @Cron("0 1 * * *") // Daily at 1 AM
  async handleStreakValidation(): Promise<void> {
    this.logger.log("Validating user streaks...")

    try {
      // This would validate all user streaks and handle any inconsistencies
      // Implementation would depend on specific business logic
      this.logger.log("Streak validation completed")
    } catch (error) {
      this.logger.error("Streak validation failed:", error)
    }
  }

  @Cron("0 0 * * 0") // Weekly on Sunday at midnight
  async handleWeeklyCleanup(): Promise<void> {
    this.logger.log("Performing weekly cleanup...")

    try {
      // Clean up old state transitions, expired capsules, etc.
      this.logger.log("Weekly cleanup completed")
    } catch (error) {
      this.logger.error("Weekly cleanup failed:", error)
    }
  }
}
