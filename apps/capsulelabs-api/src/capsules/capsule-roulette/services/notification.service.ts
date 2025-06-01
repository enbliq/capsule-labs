import { Injectable, Logger } from "@nestjs/common"
import type {
  RouletteCapsuleDrop,
  NotificationBatch,
  NotificationDeliveryStats,
} from "../entities/capsule-roulette.entity"
import { NotificationChannel } from "../entities/capsule-roulette.entity"

interface NotificationMessage {
  title: string
  body: string
  data?: any
  imageUrl?: string
  actionUrl?: string
}

interface UserNotificationPreferences {
  userId: string
  enabledChannels: NotificationChannel[]
  timezone: string
  quietHours: { start: string; end: string }
  frequency: "immediate" | "batched" | "daily"
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)
  private notificationBatches = new Map<string, NotificationBatch>()
  private userPreferences = new Map<string, UserNotificationPreferences>()
  private deliveryStats = new Map<string, NotificationDeliveryStats>()

  async sendDropNotifications(drop: RouletteCapsuleDrop): Promise<NotificationBatch> {
    const batchId = this.generateBatchId()
    const message = this.createDropNotificationMessage(drop)

    const batch: NotificationBatch = {
      id: batchId,
      dropId: drop.id,
      targetUsers: drop.eligibleUserIds,
      channels: [NotificationChannel.WEBSOCKET, NotificationChannel.PUSH],
      scheduledTime: new Date(),
      deliveryStats: {
        totalSent: 0,
        delivered: 0,
        failed: 0,
        opened: 0,
        clicked: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
      },
    }

    this.notificationBatches.set(batchId, batch)

    try {
      // Send notifications through all channels
      await Promise.all([
        this.sendWebSocketNotifications(drop.eligibleUserIds, message, drop),
        this.sendPushNotifications(drop.eligibleUserIds, message, drop),
        this.sendEmailNotifications(drop.eligibleUserIds, message, drop),
      ])

      batch.sentTime = new Date()
      drop.notificationsSent = drop.eligibleUserIds.length

      this.logger.log(`Sent drop notifications for ${drop.id} to ${drop.eligibleUserIds.length} users`)
    } catch (error) {
      this.logger.error(`Failed to send drop notifications for ${drop.id}:`, error)
    }

    return batch
  }

  async sendClaimSuccessNotification(userId: string, drop: RouletteCapsuleDrop, rewardAmount: number): Promise<void> {
    const message: NotificationMessage = {
      title: "🎉 Capsule Claimed!",
      body: `Congratulations! You won ${rewardAmount} STRK from "${drop.title}"`,
      data: {
        type: "claim_success",
        dropId: drop.id,
        rewardAmount,
        currency: "STRK",
      },
      actionUrl: `/rewards/claim/${drop.id}`,
    }

    await this.sendToUser(userId, message, [NotificationChannel.WEBSOCKET, NotificationChannel.PUSH])
  }

  async sendClaimFailureNotification(userId: string, drop: RouletteCapsuleDrop, reason: string): Promise<void> {
    const message: NotificationMessage = {
      title: "Claim Unsuccessful",
      body: `Your claim for "${drop.title}" was not successful: ${reason}`,
      data: {
        type: "claim_failure",
        dropId: drop.id,
        reason,
      },
      actionUrl: `/capsules/roulette`,
    }

    await this.sendToUser(userId, message, [NotificationChannel.WEBSOCKET])
  }

  async sendUpcomingDropReminder(userId: string, estimatedTime: Date): Promise<void> {
    const timeUntilDrop = Math.ceil((estimatedTime.getTime() - Date.now()) / (1000 * 60)) // minutes

    const message: NotificationMessage = {
      title: "🎲 Capsule Drop Soon!",
      body: `A new capsule will drop in approximately ${timeUntilDrop} minutes. Be ready!`,
      data: {
        type: "drop_reminder",
        estimatedTime: estimatedTime.toISOString(),
      },
      actionUrl: "/capsules/roulette",
    }

    await this.sendToUser(userId, message, [NotificationChannel.PUSH])
  }

  async sendStreakNotification(userId: string, streakCount: number): Promise<void> {
    const message: NotificationMessage = {
      title: `🔥 ${streakCount} Day Streak!`,
      body: `Amazing! You're on a ${streakCount} day winning streak. Keep it up!`,
      data: {
        type: "streak_milestone",
        streakCount,
      },
      actionUrl: "/profile/achievements",
    }

    await this.sendToUser(userId, message, [NotificationChannel.WEBSOCKET, NotificationChannel.PUSH])
  }

  async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    let preferences = this.userPreferences.get(userId)

    if (!preferences) {
      preferences = {
        userId,
        enabledChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.PUSH],
        timezone: "UTC",
        quietHours: { start: "22:00", end: "08:00" },
        frequency: "immediate",
      }
      this.userPreferences.set(userId, preferences)
    }

    return preferences
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserNotificationPreferences>): Promise<void> {
    const existing = await this.getUserPreferences(userId)
    const updated = { ...existing, ...preferences }
    this.userPreferences.set(userId, updated)

    this.logger.log(`Updated notification preferences for user ${userId}`)
  }

  async getDeliveryStats(batchId: string): Promise<NotificationDeliveryStats | null> {
    const batch = this.notificationBatches.get(batchId)
    return batch ? batch.deliveryStats : null
  }

  async trackNotificationEvent(
    batchId: string,
    userId: string,
    event: "delivered" | "opened" | "clicked" | "failed",
  ): Promise<void> {
    const batch = this.notificationBatches.get(batchId)
    if (!batch) return

    const stats = batch.deliveryStats

    switch (event) {
      case "delivered":
        stats.delivered++
        break
      case "opened":
        stats.opened++
        break
      case "clicked":
        stats.clicked++
        break
      case "failed":
        stats.failed++
        break
    }

    // Recalculate rates
    stats.deliveryRate = stats.totalSent > 0 ? (stats.delivered / stats.totalSent) * 100 : 0
    stats.openRate = stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0
    stats.clickRate = stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0
  }

  private async sendWebSocketNotifications(
    userIds: string[],
    message: NotificationMessage,
    drop: RouletteCapsuleDrop,
  ): Promise<void> {
    // This would integrate with your WebSocket gateway
    // For now, just logging the notification
    this.logger.log(`Sending WebSocket notifications to ${userIds.length} users for drop ${drop.id}`)

    // Simulate delivery tracking
    const batch = Array.from(this.notificationBatches.values()).find((b) => b.dropId === drop.id)
    if (batch) {
      batch.deliveryStats.totalSent += userIds.length
      batch.deliveryStats.delivered += Math.floor(userIds.length * 0.95) // 95% delivery rate
    }
  }

  private async sendPushNotifications(
    userIds: string[],
    message: NotificationMessage,
    drop: RouletteCapsuleDrop,
  ): Promise<void> {
    // This would integrate with FCM, APNs, or other push notification services
    this.logger.log(`Sending push notifications to ${userIds.length} users for drop ${drop.id}`)

    // Filter users based on preferences
    const eligibleUsers = []
    for (const userId of userIds) {
      const preferences = await this.getUserPreferences(userId)
      if (preferences.enabledChannels.includes(NotificationChannel.PUSH)) {
        if (!this.isInQuietHours(preferences)) {
          eligibleUsers.push(userId)
        }
      }
    }

    this.logger.log(`Filtered to ${eligibleUsers.length} eligible users for push notifications`)

    // Simulate delivery tracking
    const batch = Array.from(this.notificationBatches.values()).find((b) => b.dropId === drop.id)
    if (batch) {
      batch.deliveryStats.totalSent += eligibleUsers.length
      batch.deliveryStats.delivered += Math.floor(eligibleUsers.length * 0.85) // 85% delivery rate for push
    }
  }

  private async sendEmailNotifications(
    userIds: string[],
    message: NotificationMessage,
    drop: RouletteCapsuleDrop,
  ): Promise<void> {
    // Email notifications are typically sent for important events only
    // For capsule drops, we might skip email to avoid spam
    this.logger.log(`Skipping email notifications for drop ${drop.id} (not critical event)`)
  }

  private async sendToUser(
    userId: string,
    message: NotificationMessage,
    channels: NotificationChannel[],
  ): Promise<void> {
    const preferences = await this.getUserPreferences(userId)

    for (const channel of channels) {
      if (preferences.enabledChannels.includes(channel)) {
        switch (channel) {
          case NotificationChannel.WEBSOCKET:
            await this.sendWebSocketToUser(userId, message)
            break
          case NotificationChannel.PUSH:
            if (!this.isInQuietHours(preferences)) {
              await this.sendPushToUser(userId, message)
            }
            break
          case NotificationChannel.EMAIL:
            await this.sendEmailToUser(userId, message)
            break
          case NotificationChannel.SMS:
            await this.sendSmsToUser(userId, message)
            break
        }
      }
    }
  }

  private async sendWebSocketToUser(userId: string, message: NotificationMessage): Promise<void> {
    // This would send via WebSocket gateway
    this.logger.log(`Sending WebSocket notification to user ${userId}: ${message.title}`)
  }

  private async sendPushToUser(userId: string, message: NotificationMessage): Promise<void> {
    // This would send via push notification service
    this.logger.log(`Sending push notification to user ${userId}: ${message.title}`)
  }

  private async sendEmailToUser(userId: string, message: NotificationMessage): Promise<void> {
    // This would send via email service
    this.logger.log(`Sending email notification to user ${userId}: ${message.title}`)
  }

  private async sendSmsToUser(userId: string, message: NotificationMessage): Promise<void> {
    // This would send via SMS service
    this.logger.log(`Sending SMS notification to user ${userId}: ${message.title}`)
  }

  private createDropNotificationMessage(drop: RouletteCapsuleDrop): NotificationMessage {
    return {
      title: "🎲 Capsule Drop Alert!",
      body: `"${drop.title}" is now available! Be the first to claim it and win ${drop.rewardConfig.baseAmount} STRK!`,
      data: {
        type: "capsule_drop",
        dropId: drop.id,
        rewardAmount: drop.rewardConfig.baseAmount,
        currency: drop.rewardConfig.currency,
        expiresAt: drop.expiresAt.toISOString(),
      },
      imageUrl: "/images/capsule-drop.png",
      actionUrl: `/capsules/roulette/claim/${drop.id}`,
    }
  }

  private isInQuietHours(preferences: UserNotificationPreferences): boolean {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`

    const { start, end } = preferences.quietHours

    if (start <= end) {
      // Same day quiet hours (e.g., 22:00 - 23:59)
      return currentTime >= start && currentTime <= end
    } else {
      // Overnight quiet hours (e.g., 22:00 - 08:00)
      return currentTime >= start || currentTime <= end
    }
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
