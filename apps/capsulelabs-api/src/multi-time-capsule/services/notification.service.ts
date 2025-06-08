import { Injectable, Logger } from "@nestjs/common"

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  async sendCapsuleUnlockedNotification(userId: string, capsuleType: string): Promise<void> {
    this.logger.log(`Sending capsule unlocked notification to user ${userId} for ${capsuleType} capsule`)

    const notification = {
      title: "🌍 Multi-Time Capsule Unlocked!",
      body: "Amazing! You've successfully accessed the same hour across multiple time zones. Time truly is relative!",
      data: {
        type: "capsule_unlocked",
        capsuleType,
        timestamp: new Date().toISOString(),
      },
    }

    this.logger.log(`[MOCK] Multi-time capsule unlocked notification:`, notification)
  }

  async sendSessionStartedNotification(userId: string, targetHour: number, timeZones: string[]): Promise<void> {
    const notification = {
      title: "🕐 Time Zone Challenge Started!",
      body: `Your mission: Access the capsule at ${targetHour}:00 in ${timeZones.length} different time zones. Good luck!`,
      data: {
        type: "session_started",
        targetHour,
        timeZones,
      },
    }

    this.logger.log(`[MOCK] Session started notification:`, notification)
  }

  async sendProgressNotification(
    userId: string,
    completed: number,
    total: number,
    nextTimeZone?: string,
  ): Promise<void> {
    const notification = {
      title: `⏰ Progress: ${completed}/${total} Time Zones`,
      body: nextTimeZone
        ? `Great progress! Next up: ${nextTimeZone}`
        : `${total - completed} time zones remaining to unlock the capsule!`,
      data: {
        type: "progress_update",
        completed,
        total,
        nextTimeZone,
      },
    }

    this.logger.log(`[MOCK] Progress notification:`, notification)
  }

  async sendSessionExpiringNotification(userId: string, minutesRemaining: number): Promise<void> {
    const notification = {
      title: "⚠️ Session Expiring Soon!",
      body: `Only ${minutesRemaining} minutes left to complete your time zone challenge!`,
      data: {
        type: "session_expiring",
        minutesRemaining,
      },
    }

    this.logger.log(`[MOCK] Session expiring notification:`, notification)
  }

  async sendOptimalTimeNotification(userId: string, timeZone: string, minutesUntilOptimal: number): Promise<void> {
    const notification = {
      title: "🎯 Optimal Time Approaching!",
      body: `Perfect timing for ${timeZone} in ${minutesUntilOptimal} minutes!`,
      data: {
        type: "optimal_time",
        timeZone,
        minutesUntilOptimal,
      },
    }

    this.logger.log(`[MOCK] Optimal time notification:`, notification)
  }
}
