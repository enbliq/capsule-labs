import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { AlarmStreak, WakeUpLog } from "../entities/alarm-capsule.entity"
import type { NotificationService } from "./notification.service"

@Injectable()
export class AlarmStreakService {
  private readonly logger = new Logger(AlarmStreakService.name)

  constructor(
    private alarmStreakRepository: Repository<AlarmStreak>,
    private wakeUpLogRepository: Repository<WakeUpLog>,
    private notificationService: NotificationService,
    @InjectRepository(AlarmStreak) alarmStreakRepositoryInjection: Repository<AlarmStreak>,
    @InjectRepository(WakeUpLog) wakeUpLogRepositoryInjection: Repository<WakeUpLog>,
  ) {
    this.alarmStreakRepository = alarmStreakRepositoryInjection
    this.wakeUpLogRepository = wakeUpLogRepositoryInjection
  }

  async getOrCreateStreak(userId: string): Promise<AlarmStreak> {
    let streak = await this.alarmStreakRepository.findOne({
      where: { userId },
    })

    if (!streak) {
      streak = this.alarmStreakRepository.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalSuccessfulDays: 0,
        totalAttempts: 0,
        requiredStreakForUnlock: 3,
      })
      await this.alarmStreakRepository.save(streak)
      this.logger.log(`Created new streak record for user ${userId}`)
    }

    return streak
  }

  async incrementStreak(userId: string): Promise<{
    streak: AlarmStreak
    capsuleUnlocked: boolean
    isNewRecord: boolean
  }> {
    const streak = await this.getOrCreateStreak(userId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if we already incremented today
    if (streak.lastSuccessDate && streak.lastSuccessDate.getTime() === today.getTime()) {
      return { streak, capsuleUnlocked: false, isNewRecord: false }
    }

    const previousStreak = streak.currentStreak
    streak.currentStreak += 1
    streak.totalSuccessfulDays += 1
    streak.lastSuccessDate = today

    if (streak.currentStreak === 1) {
      streak.streakStartDate = today
    }

    // Check for new longest streak record
    const isNewRecord = streak.currentStreak > streak.longestStreak
    if (isNewRecord) {
      streak.longestStreak = streak.currentStreak
    }

    // Check if capsule should be unlocked
    let capsuleUnlocked = false
    if (!streak.capsuleUnlocked && streak.currentStreak >= streak.requiredStreakForUnlock) {
      streak.capsuleUnlocked = true
      streak.capsuleUnlockedAt = new Date()
      capsuleUnlocked = true

      await this.notificationService.sendCapsuleUnlockedNotification(userId)
      this.logger.log(`🎉 Capsule unlocked for user ${userId} with ${streak.currentStreak}-day streak!`)
    }

    // Send streak milestone notifications
    if (streak.currentStreak > 1 && streak.currentStreak % 5 === 0) {
      await this.notificationService.sendStreakNotification(userId, streak.currentStreak)
    }

    await this.alarmStreakRepository.save(streak)

    this.logger.log(`Incremented streak for user ${userId}: ${previousStreak} -> ${streak.currentStreak}`)

    return { streak, capsuleUnlocked, isNewRecord }
  }

  async resetStreak(userId: string, reason: string): Promise<AlarmStreak> {
    const streak = await this.getOrCreateStreak(userId)

    if (streak.currentStreak > 0) {
      const previousStreak = streak.currentStreak
      streak.currentStreak = 0
      streak.streakStartDate = null

      await this.alarmStreakRepository.save(streak)
      await this.notificationService.sendStreakResetNotification(userId, reason)

      this.logger.log(`Reset streak for user ${userId}: ${previousStreak} -> 0 (reason: ${reason})`)
    }

    return streak
  }

  async getStreakStats(userId: string): Promise<{
    currentStreak: number
    longestStreak: number
    totalSuccessfulDays: number
    totalAttempts: number
    successRate: number
    daysUntilUnlock: number
    capsuleUnlocked: boolean
    recentLogs: WakeUpLog[]
  }> {
    const streak = await this.getOrCreateStreak(userId)

    // Get recent wake-up logs (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentLogs = await this.wakeUpLogRepository.find({
      where: {
        userId,
      },
      order: { date: "DESC" },
      take: 7,
    })

    const successRate = streak.totalAttempts > 0 ? (streak.totalSuccessfulDays / streak.totalAttempts) * 100 : 0

    const daysUntilUnlock = streak.capsuleUnlocked
      ? 0
      : Math.max(0, streak.requiredStreakForUnlock - streak.currentStreak)

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalSuccessfulDays: streak.totalSuccessfulDays,
      totalAttempts: streak.totalAttempts,
      successRate: Math.round(successRate * 100) / 100,
      daysUntilUnlock,
      capsuleUnlocked: streak.capsuleUnlocked,
      recentLogs,
    }
  }

  async updateRequiredStreak(userId: string, requiredStreak: number): Promise<void> {
    const streak = await this.getOrCreateStreak(userId)
    streak.requiredStreakForUnlock = requiredStreak
    await this.alarmStreakRepository.save(streak)

    this.logger.log(`Updated required streak for user ${userId} to ${requiredStreak}`)
  }
}
