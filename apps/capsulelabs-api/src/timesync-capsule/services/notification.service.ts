import { Injectable, Logger } from "@nestjs/common"

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  async sendCapsuleUnlockedNotification(userId: string, timingAccuracy: number): Promise<void> {
    this.logger.log(`Sending capsule unlocked notification to user ${userId} with timing accuracy ${timingAccuracy}ms`)

    const notification = {
      title: "⏱️ TimeSync Capsule Unlocked!",
      body: `Perfect timing! You synced within ${timingAccuracy}ms and unlocked the TimeSync Capsule!`,
      data: {
        type: "capsule_unlocked",
        capsuleType: "timesync",
        timingAccuracy,
        timestamp: new Date().toISOString(),
      },
    }

    this.logger.log(`[MOCK] TimeSync capsule unlocked notification:`, notification)
  }

  async sendPulseBroadcastNotification(pulseId: string, scheduledTime: Date, windowMs: number): Promise<void> {
    const notification = {
      title: "🌐 Global Sync Pulse Active!",
      body: `Sync pulse is live! You have ${windowMs / 1000} seconds to sync. Tap now!`,
      data: {
        type: "pulse_broadcast",
        pulseId,
        scheduledTime: scheduledTime.toISOString(),
        windowMs,
      },
    }

    this.logger.log(`[MOCK] Pulse broadcast notification:`, notification)
  }

  async sendUpcomingPulseNotification(userId: string, timeUntilPulse: number): Promise<void> {
    const minutesUntil = Math.floor(timeUntilPulse / (1000 * 60))

    const notification = {
      title: "⏰ Sync Pulse Approaching",
      body: `Global sync pulse in ${minutesUntil} minutes. Get ready to sync!`,
      data: {
        type: "upcoming_pulse",
        timeUntilPulse,
        minutesUntil,
      },
    }

    this.logger.log(`[MOCK] Upcoming pulse notification:`, notification)
  }

  async sendSyncFailedNotification(userId: string, timeDifference: number, nextPulseTime: Date | null): Promise<void> {
    const nextPulseText = nextPulseTime
      ? `Next pulse: ${nextPulseTime.toLocaleTimeString()}`
      : "Check back for the next pulse"

    const notification = {
      title: "❌ Sync Missed",
      body: `You missed the sync window by ${timeDifference}ms. ${nextPulseText}`,
      data: {
        type: "sync_failed",
        timeDifference,
        nextPulseTime: nextPulseTime?.toISOString(),
      },
    }

    this.logger.log(`[MOCK] Sync failed notification:`, notification)
  }

  async sendNTPSyncNotification(userId: string, clockOffset: number): Promise<void> {
    const notification = {
      title: "🔄 Time Synchronized",
      body: `Your device time has been synchronized. Offset: ${clockOffset}ms`,
      data: {
        type: "ntp_sync",
        clockOffset,
      },
    }

    this.logger.log(`[MOCK] NTP sync notification:`, notification)
  }

  async sendHighLatencyWarning(userId: string, latency: number): Promise<void> {
    const notification = {
      title: "⚠️ High Network Latency",
      body: `Network latency is ${latency}ms. This may affect sync accuracy.`,
      data: {
        type: "high_latency_warning",
        latency,
      },
    }

    this.logger.log(`[MOCK] High latency warning:`, notification)
  }
}
