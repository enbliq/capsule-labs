import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { ReflectionStreak, DailyReflection } from "../entities/reflection.entity"
import type { NotificationService } from "./notification.service"
import { Inject } from "@nestjs/common"

@Injectable()
export class ReflectionStreakService {
  private readonly logger = new Logger(ReflectionStreakService.name);

  constructor(
    @Inject("REFLECTION_STREAK_REPOSITORY")
    private streakRepository: Repository<ReflectionStreak>,
    @Inject("DAILY_REFLECTION_REPOSITORY")
    private reflectionRepository: Repository<DailyReflection>,
    private notificationService: NotificationService,
  ) {}

  async getOrCreateStreak(userId: string): Promise<ReflectionStreak> {
    let streak = await this.streakRepository.findOne({
      where: { userId },
    })

    if (!streak) {
      streak = this.streakRepository.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalReflections: 0,
        requiredStreakForUnlock: 7,
        achievements: {},
      })
      await this.streakRepository.save(streak)
      this.logger.log(`Created new streak record for user ${userId}`)
    }

    return streak
  }

  async updateStreak(userId: string): Promise<{
    streak: ReflectionStreak
    capsuleUnlocked: boolean
    isNewRecord: boolean
  }> {
    const streak = await this.getOrCreateStreak(userId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if we already updated the streak today
    if (streak.lastReflectionDate && streak.lastReflectionDate.getTime() === today.getTime()) {
      return { streak, capsuleUnlocked: false, isNewRecord: false }
    }

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const previousStreak = streak.currentStreak

    // Check if this continues a streak or starts a new one
    if (streak.lastReflectionDate && streak.lastReflectionDate.getTime() === yesterday.getTime()) {
      // Continuing streak
      streak.currentStreak += 1
    } else if (streak.lastReflectionDate && streak.lastReflectionDate.getTime() < yesterday.getTime()) {
      // Streak was broken, start new one
      streak.currentStreak = 1
      streak.streakStartDate = today
    } else {
      // First reflection or continuing from today
      streak.currentStreak = 1
      streak.streakStartDate = today
    }

    streak.totalReflections += 1
    streak.lastReflectionDate = today

    // Check for new longest streak record
    const isNewRecord = streak.currentStreak > streak.longestStreak
    if (isNewRecord) {
      streak.longestStreak = streak.currentStreak
    }

    // Update achievements
    if (!streak.achievements.firstReflection) {
      streak.achievements.firstReflection = today
    }

    // Check if capsule should be unlocked
    let capsuleUnlocked = false
    if (!streak.capsuleUnlocked && streak.currentStreak >= streak.requiredStreakForUnlock) {
      streak.capsuleUnlocked = true
      streak.capsuleUnlockedAt = new Date()
      capsuleUnlocked = true

      await this.notificationService.sendCapsuleUnlockedNotification(userId, "reflection")
      this.logger.log(`🎉 Reflection Capsule unlocked for user ${userId} with ${streak.currentStreak}-day streak!`)
    }

    // Send milestone notifications
    if (streak.currentStreak > 1) {
      if (streak.currentStreak === 3) {
        await this.notificationService.sendStreakMilestoneNotification(userId, streak.currentStreak, "reflection")
      } else if (streak.currentStreak === 7) {
        await this.notificationService.sendStreakMilestoneNotification(userId, streak.currentStreak, "reflection")
      } else if (streak.currentStreak % 10 === 0) {
        await this.notificationService.sendStreakMilestoneNotification(userId, streak.currentStreak, "reflection")
      }
    }

    await this.streakRepository.save(streak)

    this.logger.log(`Updated reflection streak for user ${userId}: ${previousStreak} -> ${streak.currentStreak}`)

    return { streak, capsuleUnlocked, isNewRecord }
  }

  async recalculateStreak(userId: string): Promise<ReflectionStreak> {
    const streak = await this.getOrCreateStreak(userId)

    // Get all reflections ordered by date
    const reflections = await this.reflectionRepository.find({
      where: { userId },
      order: { reflectionDate: "ASC" },
    })

    if (reflections.length === 0) {
      streak.currentStreak = 0
      streak.longestStreak = 0
      streak.totalReflections = 0
      streak.lastReflectionDate = null
      streak.streakStartDate = null
      streak.capsuleUnlocked = false
      streak.capsuleUnlockedAt = null
      await this.streakRepository.save(streak)
      return streak
    }

    // Recalculate streaks
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let lastDate: Date | null = null

    for (const reflection of reflections) {
      const reflectionDate = new Date(reflection.reflectionDate)
      reflectionDate.setHours(0, 0, 0, 0)

      if (!lastDate) {
        // First reflection
        tempStreak = 1
      } else {
        const expectedDate = new Date(lastDate)
        expectedDate.setDate(expectedDate.getDate() + 1)

        if (reflectionDate.getTime() === expectedDate.getTime()) {
          // Consecutive day
          tempStreak += 1
        } else {
          // Gap in reflections
          longestStreak = Math.max(longestStreak, tempStreak)
          tempStreak = 1
        }
      }

      lastDate = reflectionDate
    }

    longestStreak = Math.max(longestStreak, tempStreak)

    // Calculate current streak (from the end)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (lastDate) {
      const daysSinceLastReflection = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysSinceLastReflection <= 1) {
        // Current streak is active
        currentStreak = tempStreak
      } else {
        // Streak is broken
        currentStreak = 0
      }
    }

    // Update streak record
    streak.currentStreak = currentStreak
    streak.longestStreak = longestStreak
    streak.totalReflections = reflections.length
    streak.lastReflectionDate = lastDate

    // Check capsule unlock status
    if (streak.currentStreak >= streak.requiredStreakForUnlock && !streak.capsuleUnlocked) {
      streak.capsuleUnlocked = true
      streak.capsuleUnlockedAt = new Date()
    } else if (streak.currentStreak < streak.requiredStreakForUnlock) {
      streak.capsuleUnlocked = false
      streak.capsuleUnlockedAt = null
    }

    await this.streakRepository.save(streak)

    this.logger.log(`Recalculated streak for user ${userId}: current=${currentStreak}, longest=${longestStreak}`)

    return streak
  }

  async getStreakStats(userId: string): Promise<{
    currentStreak: number
    longestStreak: number
    totalReflections: number
    daysUntilUnlock: number
    capsuleUnlocked: boolean
    streakStartDate: Date | null
    achievements: any
    recentActivity: boolean[]
  }> {
    const streak = await this.getOrCreateStreak(userId)

    const daysUntilUnlock = streak.capsuleUnlocked
      ? 0
      : Math.max(0, streak.requiredStreakForUnlock - streak.currentStreak)

    // Get recent activity (last 14 days)
    const recentActivity: boolean[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 13; i >= 0; i--) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)

      const hasReflection = await this.reflectionRepository.findOne({
        where: {
          userId,
          reflectionDate: checkDate,
        },
      })

      recentActivity.push(!!hasReflection)
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalReflections: streak.totalReflections,
      daysUntilUnlock,
      capsuleUnlocked: streak.capsuleUnlocked,
      streakStartDate: streak.streakStartDate,
      achievements: streak.achievements,
      recentActivity,
    }
  }

  async resetStreak(userId: string, reason: string): Promise<ReflectionStreak> {
    const streak = await this.getOrCreateStreak(userId)

    if (streak.currentStreak > 0) {
      const previousStreak = streak.currentStreak
      streak.currentStreak = 0
      streak.streakStartDate = null

      if (streak.capsuleUnlocked) {
        streak.capsuleUnlocked = false
        streak.capsuleUnlockedAt = null
      }

      await this.streakRepository.save(streak)
      await this.notificationService.sendStreakResetNotification(userId, reason, "reflection")

      this.logger.log(`Reset reflection streak for user ${userId}: ${previousStreak} -> 0 (reason: ${reason})`)
    }

    return streak
  }
}
