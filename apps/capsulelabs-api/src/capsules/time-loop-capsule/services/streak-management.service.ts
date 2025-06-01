import { Injectable, Logger } from "@nestjs/common"
import type { UserProgress, LoopConfig, StreakEntry } from "../entities/time-loop-capsule.entity"

@Injectable()
export class StreakManagementService {
  private readonly logger = new Logger(StreakManagementService.name)

  updateStreak(
    userProgress: UserProgress,
    loopConfig: LoopConfig,
  ): { eligibleForPermanentUnlock: boolean; streakIncreased: boolean } {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Check if user already completed tasks today
    const completedToday = userProgress.lastCompletionDate && this.isSameDay(userProgress.lastCompletionDate, today)

    if (completedToday) {
      // Already completed today, no streak update needed
      return {
        eligibleForPermanentUnlock: userProgress.currentStreak >= loopConfig.streakRequiredForPermanentUnlock,
        streakIncreased: false,
      }
    }

    // Check if user completed tasks yesterday (streak continuation)
    const completedYesterday =
      userProgress.lastCompletionDate && this.isSameDay(userProgress.lastCompletionDate, yesterday)

    let streakIncreased = false

    if (completedYesterday || userProgress.currentStreak === 0) {
      // Continue or start streak
      userProgress.currentStreak++
      streakIncreased = true
    } else {
      // Streak was broken, reset to 1
      userProgress.currentStreak = 1
      streakIncreased = true
    }

    // Update completion tracking
    userProgress.lastCompletionDate = today
    userProgress.totalDaysCompleted++

    // Update longest streak
    if (userProgress.currentStreak > userProgress.longestStreak) {
      userProgress.longestStreak = userProgress.currentStreak
    }

    // Add to streak history
    const todayEntry: StreakEntry = {
      date: today,
      tasksCompleted: userProgress.currentDayTasks.filter((t) => t.isValid).length,
      totalTasks: userProgress.currentDayTasks.length,
      points: userProgress.currentDayTasks.reduce((sum, t) => sum + (t.isValid ? t.points : 0), 0),
      completionRate: this.calculateCompletionRate(userProgress.currentDayTasks),
    }

    userProgress.streakHistory.push(todayEntry)

    // Check eligibility for permanent unlock
    const eligibleForPermanentUnlock = userProgress.currentStreak >= loopConfig.streakRequiredForPermanentUnlock
    userProgress.isEligibleForPermanentUnlock = eligibleForPermanentUnlock

    this.logger.log(
      `User ${userProgress.userId} streak updated: ${userProgress.currentStreak} days (eligible for permanent unlock: ${eligibleForPermanentUnlock})`,
    )

    return { eligibleForPermanentUnlock, streakIncreased }
  }

  breakStreak(userProgress: UserProgress, reason: string): void {
    const previousStreak = userProgress.currentStreak

    if (previousStreak > 0) {
      userProgress.currentStreak = 0
      userProgress.isEligibleForPermanentUnlock = false

      // Add missed day to history
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      userProgress.missedDays.push(yesterday)

      this.logger.log(`User ${userProgress.userId} streak broken: ${previousStreak} -> 0 (${reason})`)
    }
  }

  applyMakeupTask(userProgress: UserProgress, missedDate: Date, points: number): void {
    // Remove the missed date from missed days
    userProgress.missedDays = userProgress.missedDays.filter((date) => !this.isSameDay(date, missedDate))

    // Add makeup entry to streak history
    const makeupEntry: StreakEntry = {
      date: missedDate,
      tasksCompleted: 1, // Makeup task
      totalTasks: 1,
      points,
      completionRate: 100,
    }

    // Insert in correct chronological order
    const insertIndex = userProgress.streakHistory.findIndex((entry) => entry.date > missedDate)
    if (insertIndex === -1) {
      userProgress.streakHistory.push(makeupEntry)
    } else {
      userProgress.streakHistory.splice(insertIndex, 0, makeupEntry)
    }

    // Recalculate streak based on updated history
    this.recalculateStreak(userProgress)

    this.logger.log(`User ${userProgress.userId} completed makeup task for ${missedDate.toDateString()}`)
  }

  private recalculateStreak(userProgress: UserProgress): void {
    // Sort streak history by date
    userProgress.streakHistory.sort((a, b) => a.date.getTime() - b.date.getTime())

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    const today = new Date()
    const checkDate = new Date(today)

    // Work backwards from today to find current streak
    for (let i = 0; i < 365; i++) {
      // Check up to a year back
      const entry = userProgress.streakHistory.find((e) => this.isSameDay(e.date, checkDate))

      if (entry && entry.completionRate >= 100) {
        if (i === 0 || currentStreak > 0) {
          // Today or continuing streak
          currentStreak++
        }
        tempStreak++
      } else {
        if (i === 0) {
          // No completion today, current streak is 0
          currentStreak = 0
        }
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak
        }
        tempStreak = 0
      }

      checkDate.setDate(checkDate.getDate() - 1)
    }

    // Final check for longest streak
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak
    }

    userProgress.currentStreak = currentStreak
    userProgress.longestStreak = Math.max(userProgress.longestStreak, longestStreak)
  }

  getStreakStatistics(userProgress: UserProgress): {
    currentStreak: number
    longestStreak: number
    totalDaysCompleted: number
    averageCompletionRate: number
    streakPercentage: number
    missedDaysCount: number
  } {
    const totalDays = userProgress.streakHistory.length
    const averageCompletionRate =
      totalDays > 0 ? userProgress.streakHistory.reduce((sum, entry) => sum + entry.completionRate, 0) / totalDays : 0

    const streakPercentage = totalDays > 0 ? (userProgress.totalDaysCompleted / totalDays) * 100 : 0

    return {
      currentStreak: userProgress.currentStreak,
      longestStreak: userProgress.longestStreak,
      totalDaysCompleted: userProgress.totalDaysCompleted,
      averageCompletionRate: Math.round(averageCompletionRate * 10) / 10,
      streakPercentage: Math.round(streakPercentage * 10) / 10,
      missedDaysCount: userProgress.missedDays.length,
    }
  }

  private calculateCompletionRate(tasks: any[]): number {
    if (tasks.length === 0) return 0
    const completedTasks = tasks.filter((t) => t.isValid).length
    return (completedTasks / tasks.length) * 100
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }
}
