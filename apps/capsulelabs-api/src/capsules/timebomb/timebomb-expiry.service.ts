import { Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { InjectModel } from "@nestjs/mongoose"
import type { Model } from "mongoose"
import { TimeBombCapsule } from "./schemas/timebomb-capsule.schema"
import type { NotificationsService } from "../../notifications/notifications.service"
import type { UsersService } from "../../users/users.service"

export class TimeBombExpiryService {
  private readonly logger = new Logger(TimeBombExpiryService.name);

  constructor(
    @InjectModel(TimeBombCapsule.name)
    private timeBombModel: Model<TimeBombCapsule>,
    private notificationsService: NotificationsService,
    private usersService: UsersService
  ) {}

  /**
   * Check for expired capsules every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCapsuleExpiry() {
    this.logger.debug("Running scheduled task: Check for expired capsules")

    const now = new Date()

    try {
      // Find active capsules that have expired
      const expiredCapsules = await this.timeBombModel
        .find({
          status: "active",
          expiresAt: { $lte: now },
        })
        .exec()

      this.logger.debug(`Found ${expiredCapsules.length} expired capsules`)

      // Process each expired capsule
      for (const capsule of expiredCapsules) {
        await this.processCapsuleExpiry(capsule)
      }
    } catch (error) {
      this.logger.error(`Error processing expired capsules: ${error.message}`, error.stack)
    }
  }

  /**
   * Process a single expired capsule
   */
  private async processCapsuleExpiry(capsule: TimeBombCapsule) {
    try {
      // Update capsule status to expired
      capsule.status = "expired"
      await capsule.save()

      this.logger.debug(`Updated capsule ${capsule.id} status to expired`)

      // Find the creator
      const creator = await this.usersService.findByUsername(capsule.createdBy)

      if (creator) {
        // Send notification to creator
        await this.notificationsService.sendTimeBombExpiryNotification(
          creator.id,
          creator.username,
          capsule.id,
          capsule.defusers,
        )

        this.logger.debug(`Sent expiry notification to ${creator.username} for capsule ${capsule.id}`)
      } else {
        this.logger.warn(`Creator ${capsule.createdBy} not found for capsule ${capsule.id}`)
      }
    } catch (error) {
      this.logger.error(`Error processing expiry for capsule ${capsule.id}: ${error.message}`, error.stack)
    }
  }

  /**
   * Manually trigger expiry check (useful for testing)
   */
  async triggerExpiryCheck() {
    await this.handleCapsuleExpiry()
    return { message: "Expiry check triggered successfully" }
  }
}
