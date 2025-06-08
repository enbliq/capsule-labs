import { Injectable } from "@nestjs/common"
import type { StreakCapsule } from "../entities/streak-capsule.entity"
import type { CheckInService } from "./check-in.service"

@Injectable()
export class StreakCalculationService {
  constructor(private checkInService: CheckInService) {}

  async updateCapsuleStreak(capsule: StreakCapsule): Promise<{
    currentStreak: number
    longestStreak: number
    totalCheckIns: number
    isStreakComplete: boolean
    isStreakBroken: boolean
  }> {
    const stats = await this.checkInService.getStreakStats(capsule.userId, capsule.timezone)

    const previousStreak = capsule.currentStreak
    const isStreakBroken = stats.currentStreak < previousStreak && previousStreak > 0
    const isStreakComplete = stats.currentStreak >= capsule.requiredStreakDays && !capsule.unlockedAt

    return {
      currentStreak: stats.currentStreak,
      longestStreak: Math.max(stats.longestStreak, capsule.longestStreak),
      totalCheckIns: stats.totalCheckIns,
      isStreakComplete,
      isStreakBroken,
    }
  }

  calculateProgressPercentage(currentStreak: number, requiredStreak: number): number {
    if (requiredStreak === 0) return 100
    return Math.min((currentStreak / requiredStreak) * 100, 100)
  }

  calculateDaysRemaining(currentStreak: number, requiredStreak: number): number {
    return Math.max(requiredStreak - currentStreak, 0)
  }

  isWithinGracePeriod(lastCheckInDate: Date | null, gracePeriodHours: number, timezone = "UTC"): boolean {
    if (!lastCheckInDate || gracePeriodHours === 0) {
      return false
    }

    const now = new Date()
    const gracePeriodEnd = new Date(lastCheckInDate)
    gracePeriodEnd.setHours(gracePeriodEnd.getHours() + 24 + gracePeriodHours)

    return now <= gracePeriodEnd
  }

  getStreakStatus(
    currentStreak: number,
    requiredStreak: number,
    lastCheckInDate: Date | null,
    allowGracePeriod: boolean,
    gracePeriodHours: number,
    timezone: string,
  ): {
    isActive: boolean
    isComplete: boolean
    isBroken: boolean
    isInGracePeriod: boolean
  } {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isComplete = currentStreak >= requiredStreak
    const isInGracePeriod = allowGracePeriod && this.isWithinGracePeriod(lastCheckInDate, gracePeriodHours, timezone)

    let isActive = false
    let isBroken = false

    if (lastCheckInDate) {
      const lastCheckIn = new Date(lastCheckInDate)
      const isTodayOrYesterday =
        this.isSameDate(lastCheckIn, today) || this.isSameDate(lastCheckIn, yesterday) || isInGracePeriod

      isActive = isTodayOrYesterday
      isBroken = !isActive && currentStreak > 0
    }

    return {
      isActive,
      isComplete,
      isBroken,
      isInGracePeriod,
    }
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }
}
