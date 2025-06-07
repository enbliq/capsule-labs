import { Injectable, Logger } from "@nestjs/common"

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  async sendCapsuleUnlockedNotification(userId: string, capsuleType: string): Promise<void> {
    this.logger.log(`Sending capsule unlocked notification to user ${userId} for ${capsuleType} capsule`)

    // Mock implementation - replace with actual notification service
    const notification = {
      title: "🎉 Reflection Capsule Unlocked!",
      body: "Congratulations! You've completed 7 days of gratitude reflections. Your mindfulness journey continues!",
      data: {
        type: "capsule_unlocked",
        capsuleType,
        timestamp: new Date().toISOString(),
      },
    }

    // In production, integrate with:
    // - Firebase Cloud Messaging
    // - Apple Push Notification Service
    // - Email notifications
    // - In-app notifications

    this.logger.log(`[MOCK] Capsule unlocked notification:`, notification)
  }

  async sendStreakMilestoneNotification(userId: string, streakCount: number, type: string): Promise<void> {
    const milestoneMessages = {
      3: "🌱 3-day reflection streak! You're building a great habit.",
      7: "🌟 Amazing! 7 days of reflection completed. Capsule unlocked!",
      10: "🔥 10-day streak! Your mindfulness practice is strong.",
      20: "💎 20 days of reflection! You're a mindfulness master.",
      30: "🏆 30-day streak! Incredible dedication to self-reflection.",
    }

    const message = milestoneMessages[streakCount] || `🎯 ${streakCount}-day reflection streak! Keep it up!`

    const notification = {
      title: `${streakCount}-Day Streak!`,
      body: message,
      data: {
        type: "streak_milestone",
        streakCount,
        capsuleType: type,
      },
    }

    this.logger.log(`[MOCK] Streak milestone notification:`, notification)
  }

  async sendStreakResetNotification(userId: string, reason: string, type: string): Promise<void> {
    const notification = {
      title: "💭 Reflection Streak Reset",
      body: "Your reflection streak has been reset. Every day is a new opportunity for gratitude and growth!",
      data: {
        type: "streak_reset",
        reason,
        capsuleType: type,
      },
    }

    this.logger.log(`[MOCK] Streak reset notification:`, notification)
  }

  async sendDailyReminderNotification(userId: string): Promise<void> {
    const prompts = [
      "What made you smile today?",
      "What are you grateful for right now?",
      "What's one thing that went well today?",
      "Who are you thankful for and why?",
      "What small moment brought you joy?",
      "What challenge helped you grow today?",
      "What's something beautiful you noticed?",
    ]

    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)]

    const notification = {
      title: "🌅 Time for Reflection",
      body: `Daily prompt: ${randomPrompt}`,
      data: {
        type: "daily_reminder",
        prompt: randomPrompt,
      },
    }

    this.logger.log(`[MOCK] Daily reminder notification:`, notification)
  }
}
