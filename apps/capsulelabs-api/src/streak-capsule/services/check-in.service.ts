import { Injectable, BadRequestException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { DailyCheckIn } from "../entities/daily-check-in.entity"
import type { StreakStatsDto } from "../dto/streak-capsule-response.dto"

@Injectable()
export class CheckInService {
  constructor(
    @InjectRepository(DailyCheckIn)
    private checkInRepository: Repository<DailyCheckIn>,
  ) {}

  async checkIn(
    userId: string,
    timezone = "UTC",
    metadata?: Record<string, any>,
  ): Promise<{ checkIn: DailyCheckIn; isNewRecord: boolean }> {
    const today = this.getTodayInTimezone(timezone)

    // Check if user already checked in today
    const existingCheckIn = await this.checkInRepository.findOne({
      where: {
        userId,
        checkInDate: today,
      },
    })

    if (existingCheckIn) {
      throw new BadRequestException("Already checked in today")
    }

    // Get yesterday's check-in to determine streak
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const yesterdayCheckIn = await this.checkInRepository.findOne({
      where: {
        userId,
        checkInDate: yesterday,
      },
    })

    // Calculate streak day
    let streakDay = 1
    if (yesterdayCheckIn) {
      streakDay = yesterdayCheckIn.streakDay + 1
    }

    // Create new check-in
    const checkIn = this.checkInRepository.create({
      userId,
      checkInDate: today,
      timezone,
      streakDay,
      metadata,
    })

    const savedCheckIn = await this.checkInRepository.save(checkIn)

    // Check if this is a new record
    const longestStreak = await this.getLongestStreak(userId)
    const isNewRecord = streakDay > longestStreak

    return { checkIn: savedCheckIn, isNewRecord }
  }

  async getStreakStats(userId: string, timezone = "UTC"): Promise<StreakStatsDto> {
    const today = this.getTodayInTimezone(timezone)

    // Get current streak
    const currentStreak = await this.getCurrentStreak(userId, today)

    // Get longest streak
    const longestStreak = await this.getLongestStreak(userId)

    // Get total check-ins
    const totalCheckIns = await this.checkInRepository.count({
      where: { userId },
    })

    // Get last check-in date
    const lastCheckIn = await this.checkInRepository.findOne({
      where: { userId },
      order: { checkInDate: "DESC" },
    })

    // Get streak start date (first day of current streak)
    let streakStartDate: Date | undefined
    if (currentStreak > 0) {
      const streakStart = new Date(today)
      streakStart.setDate(streakStart.getDate() - currentStreak + 1)
      streakStartDate = streakStart
    }

    // Check if streak is active (checked in today or yesterday)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isStreakActive =
      lastCheckIn &&
      (this.isSameDate(lastCheckIn.checkInDate, today) || this.isSameDate(lastCheckIn.checkInDate, yesterday))

    return {
      currentStreak,
      longestStreak,
      totalCheckIns,
      lastCheckInDate: lastCheckIn?.checkInDate,
      streakStartDate,
      isStreakActive: !!isStreakActive,
    }
  }

  async getCurrentStreak(userId: string, referenceDate: Date): Promise<number> {
    // Get all check-ins in descending order
    const checkIns = await this.checkInRepository.find({
      where: { userId },
      order: { checkInDate: "DESC" },
    })

    if (checkIns.length === 0) {
      return 0
    }

    let streak = 0
    const currentDate = new Date(referenceDate)

    // Check if user checked in today
    if (this.isSameDate(checkIns[0].checkInDate, currentDate)) {
      streak = 1
      currentDate.setDate(currentDate.getDate() - 1)
    }
    // If not checked in today, check if checked in yesterday
    else {
      currentDate.setDate(currentDate.getDate() - 1)
      if (!this.isSameDate(checkIns[0].checkInDate, currentDate)) {
        return 0 // Streak is broken
      }
      streak = 1
      currentDate.setDate(currentDate.getDate() - 1)
    }

    // Count consecutive days
    for (let i = 1; i < checkIns.length; i++) {
      if (this.isSameDate(checkIns[i].checkInDate, currentDate)) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  async getLongestStreak(userId: string): Promise<number> {
    const checkIns = await this.checkInRepository.find({
      where: { userId },
      order: { checkInDate: "ASC" },
    })

    if (checkIns.length === 0) {
      return 0
    }

    let longestStreak = 1
    let currentStreak = 1

    for (let i = 1; i < checkIns.length; i++) {
      const prevDate = new Date(checkIns[i - 1].checkInDate)
      const currentDate = new Date(checkIns[i].checkInDate)

      // Check if dates are consecutive
      prevDate.setDate(prevDate.getDate() + 1)

      if (this.isSameDate(prevDate, currentDate)) {
        currentStreak++
        longestStreak = Math.max(longestStreak, currentStreak)
      } else {
        currentStreak = 1
      }
    }

    return longestStreak
  }

  async canCheckInToday(userId: string, timezone = "UTC"): Promise<boolean> {
    const today = this.getTodayInTimezone(timezone)

    const existingCheckIn = await this.checkInRepository.findOne({
      where: {
        userId,
        checkInDate: today,
      },
    })

    return !existingCheckIn
  }

  async getUserCheckIns(userId: string, limit = 30): Promise<DailyCheckIn[]> {
    return await this.checkInRepository.find({
      where: { userId },
      order: { checkInDate: "DESC" },
      take: limit,
    })
  }

  private getTodayInTimezone(timezone: string): Date {
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000

    // Get timezone offset (this is a simplified approach)
    // In a real application, you might want to use a library like moment-timezone
    const targetTime = new Date(utc)

    // Return just the date part
    return new Date(targetTime.getFullYear(), targetTime.getMonth(), targetTime.getDate())
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }
}
