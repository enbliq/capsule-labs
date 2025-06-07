import { Injectable, Logger, BadRequestException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { WakeUpLog, AlarmSettings } from "../entities/alarm-capsule.entity"
import type { AlarmStreakService } from "./alarm-streak.service"
import type { WakeUpLogDto, AlarmResponseDto } from "../dto/alarm-settings.dto"

@Injectable()
export class WakeUpTrackerService {
  private readonly logger = new Logger(WakeUpTrackerService.name);

  constructor(
    @InjectRepository(WakeUpLog)
    private wakeUpLogRepository: Repository<WakeUpLog>,
    @InjectRepository(AlarmSettings)
    private alarmSettingsRepository: Repository<AlarmSettings>,
    private alarmStreakService: AlarmStreakService,
  ) {}

  async logWakeUp(
    userId: string,
    wakeUpData: WakeUpLogDto,
  ): Promise<{
    success: boolean
    status: "on_time" | "late" | "missed"
    minutesLate: number
    streakUpdated: boolean
    capsuleUnlocked: boolean
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find today's wake-up log
    let wakeUpLog = await this.wakeUpLogRepository.findOne({
      where: {
        userId,
        date: today,
      },
    })

    if (!wakeUpLog) {
      // Create a new log if it doesn't exist (manual wake-up)
      const settings = await this.alarmSettingsRepository.findOne({
        where: { userId, isActive: true },
      })

      if (!settings) {
        throw new BadRequestException("No active alarm settings found")
      }

      const targetWakeTime = new Date(today)
      targetWakeTime.setHours(settings.targetHour, settings.targetMinute, 0, 0)

      wakeUpLog = this.wakeUpLogRepository.create({
        userId,
        date: today,
        targetWakeTime,
        status: "pending",
      })
    }

    // Calculate if wake-up was on time
    const wakeUpTime = new Date(wakeUpData.wakeUpTime)
    const targetTime = wakeUpLog.targetWakeTime
    const graceWindow = await this.getGraceWindowForUser(userId)
    const graceWindowEnd = new Date(targetTime.getTime() + graceWindow * 60 * 1000)

    const minutesLate = Math.max(0, Math.floor((wakeUpTime.getTime() - targetTime.getTime()) / (1000 * 60)))

    let status: "on_time" | "late" | "missed"
    let streakUpdated = false
    let capsuleUnlocked = false

    if (wakeUpTime <= graceWindowEnd) {
      status = "on_time"
      const result = await this.alarmStreakService.incrementStreak(userId)
      streakUpdated = true
      capsuleUnlocked = result.capsuleUnlocked
    } else {
      status = "late"
      await this.alarmStreakService.resetStreak(userId, "late_wake_up")
      streakUpdated = true
    }

    // Update the wake-up log
    wakeUpLog.actualWakeTime = wakeUpTime
    wakeUpLog.status = status
    wakeUpLog.wakeMethod = wakeUpData.method || "manual"
    wakeUpLog.minutesLate = minutesLate
    wakeUpLog.metadata = {
      ...wakeUpLog.metadata,
      loggedAt: new Date(),
      method: wakeUpData.method,
    }

    await this.wakeUpLogRepository.save(wakeUpLog)

    this.logger.log(`Logged wake-up for user ${userId}: ${status} (${minutesLate} minutes late)`)

    return {
      success: true,
      status,
      minutesLate,
      streakUpdated,
      capsuleUnlocked,
    }
  }

  async handleAlarmResponse(
    userId: string,
    responseData: AlarmResponseDto,
  ): Promise<{
    success: boolean
    action: string
    nextAlarmTime?: Date
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const wakeUpLog = await this.wakeUpLogRepository.findOne({
      where: {
        userId,
        date: today,
        status: "pending",
      },
    })

    if (!wakeUpLog) {
      throw new BadRequestException("No pending alarm found for today")
    }

    wakeUpLog.alarmResponseTime = responseData.responseTime

    switch (responseData.action) {
      case "dismiss":
        // Log as wake-up
        await this.logWakeUp(userId, {
          wakeUpTime: responseData.responseTime,
          method: "alarm",
        })
        break

      case "snooze":
        // Schedule snooze (typically 5-10 minutes)
        const snoozeMinutes = 5
        const nextAlarmTime = new Date(responseData.responseTime.getTime() + snoozeMinutes * 60 * 1000)

        wakeUpLog.metadata = {
          ...wakeUpLog.metadata,
          snoozed: true,
          snoozeTime: responseData.responseTime,
          nextAlarmTime,
        }

        await this.wakeUpLogRepository.save(wakeUpLog)

        return {
          success: true,
          action: "snooze",
          nextAlarmTime,
        }

      case "late_response":
        // Mark as late and reset streak
        wakeUpLog.status = "late"
        await this.alarmStreakService.resetStreak(userId, "late_alarm_response")
        break
    }

    await this.wakeUpLogRepository.save(wakeUpLog)

    return {
      success: true,
      action: responseData.action,
    }
  }

  async getTodaysWakeUpStatus(userId: string): Promise<{
    hasWokenUp: boolean
    status: string
    targetTime: Date | null
    actualTime: Date | null
    minutesLate: number
    graceWindowRemaining: number
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const wakeUpLog = await this.wakeUpLogRepository.findOne({
      where: {
        userId,
        date: today,
      },
    })

    if (!wakeUpLog) {
      return {
        hasWokenUp: false,
        status: "no_alarm_set",
        targetTime: null,
        actualTime: null,
        minutesLate: 0,
        graceWindowRemaining: 0,
      }
    }

    const now = new Date()
    const graceWindow = await this.getGraceWindowForUser(userId)
    const graceWindowEnd = new Date(wakeUpLog.targetWakeTime.getTime() + graceWindow * 60 * 1000)
    const graceWindowRemaining = Math.max(0, Math.floor((graceWindowEnd.getTime() - now.getTime()) / (1000 * 60)))

    return {
      hasWokenUp: wakeUpLog.actualWakeTime !== null,
      status: wakeUpLog.status,
      targetTime: wakeUpLog.targetWakeTime,
      actualTime: wakeUpLog.actualWakeTime,
      minutesLate: wakeUpLog.minutesLate || 0,
      graceWindowRemaining,
    }
  }

  async getWakeUpHistory(userId: string, days = 30): Promise<WakeUpLog[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    return this.wakeUpLogRepository.find({
      where: {
        userId,
      },
      order: { date: "DESC" },
      take: days,
    })
  }

  private async getGraceWindowForUser(userId: string): Promise<number> {
    const settings = await this.alarmSettingsRepository.findOne({
      where: { userId, isActive: true },
    })
    return settings?.graceWindowMinutes || 10
  }
}
