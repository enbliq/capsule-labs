import { Injectable, Logger } from "@nestjs/common"

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  async sendCapsuleUnlockedNotification(userId: string): Promise<void> {
    this.logger.log(`Sending capsule unlocked notification to user ${userId} for flip capsule`)

    const notification = {
      title: "🔄 Flip Capsule Unlocked!",
      body: "Congratulations! You've successfully completed the flip challenge and unlocked the Flip Capsule!",
      data: {
        type: "capsule_unlocked",
        capsuleType: "flip",
        timestamp: new Date().toISOString(),
      },
    }

    this.logger.log(`[MOCK] Flip capsule unlocked notification:`, notification)
  }

  async sendSessionStartedNotification(userId: string, sessionId: string, requiredDuration: number): Promise<void> {
    const notification = {
      title: "🔄 Flip Challenge Started",
      body: `Flip your phone upside down and hold for ${requiredDuration / 1000} seconds to unlock the capsule!`,
      data: {
        type: "session_started",
        sessionId,
        requiredDuration,
      },
    }

    this.logger.log(`[MOCK] Session started notification:`, notification)
  }

  async sendProgressNotification(userId: string, progress: number): Promise<void> {
    const notification = {
      title: "🔄 Almost There!",
      body: `You're ${Math.round(progress * 100)}% of the way to unlocking the Flip Capsule. Keep holding!`,
      data: {
        type: "progress_update",
        progress,
      },
    }

    this.logger.log(`[MOCK] Progress notification:`, notification)
  }

  async sendSessionFailedNotification(userId: string, reason: string): Promise<void> {
    const notification = {
      title: "❌ Flip Challenge Interrupted",
      body: `Your flip challenge was interrupted: ${reason}. Try again!`,
      data: {
        type: "session_failed",
        reason,
      },
    }

    this.logger.log(`[MOCK] Session failed notification:`, notification)
  }

  async sendDeviceUnsupportedNotification(userId: string, missingFeatures: string[]): Promise<void> {
    const notification = {
      title: "⚠️ Device Compatibility Issue",
      body: `Your device may not fully support the flip challenge. Missing: ${missingFeatures.join(", ")}`,
      data: {
        type: "device_unsupported",
        missingFeatures,
      },
    }

    this.logger.log(`[MOCK] Device unsupported notification:`, notification)
  }
}
