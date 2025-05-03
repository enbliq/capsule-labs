import { Injectable, Logger } from "@nestjs/common"

export interface Notification {
  userId: string
  username: string
  message: string
  type: "info" | "success" | "warning" | "error"
  metadata?: Record<string, any>
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  /**
   * Send a notification to a user
   * In a real application, this would integrate with a notification system
   * For the MVP, we'll just log the notification
   */
  async sendNotification(notification: Notification): Promise<void> {
    this.logger.log(
      `Notification to ${notification.username} (${notification.userId}): ${notification.message}`,
      JSON.stringify(notification.metadata || {}),
    )

    // In a real application, you would implement actual notification delivery here
    // For example:
    // - Send an email
    // - Send a push notification
    // - Store in a database for retrieval by the client
    // - Integrate with a third-party notification service
  }

  /**
   * Send a notification about a TimeBomb capsule expiry
   */
  async sendTimeBombExpiryNotification(
    userId: string,
    username: string,
    capsuleId: string,
    defusers: string[],
  ): Promise<void> {
    let message: string
    let type: "info" | "warning"

    if (defusers.length === 0) {
      message = "Your bomb exploded. No one was quick enough."
      type = "warning"
    } else {
      message = `Your bomb was defused by: ${defusers.join(", ")}`
      type = "info"
    }

    await this.sendNotification({
      userId,
      username,
      message,
      type,
      metadata: {
        capsuleId,
        defusers,
        eventType: "capsule_expiry",
      },
    })
  }
}
