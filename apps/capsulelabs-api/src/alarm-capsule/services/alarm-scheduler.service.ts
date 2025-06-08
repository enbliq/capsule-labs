import { Injectable, Logger } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { AlarmSettings, type WakeUpLog } from "../entities/alarm-capsule.entity"
import type { NotificationService } from "./notification.service"
import type { AlarmStreakService } from "./alarm-streak.service"

@Injectable()
export class AlarmSchedulerService {
  private readonly logger = new Logger(AlarmSchedulerService.name);

  constructor(
    private alarmSettingsRepository: Repository<AlarmSettings>,
    private wakeUpLogRepository: Repository<WakeUpLog>,
    private notificationService: NotificationService,
    private alarmStreakService: AlarmStreakService,
    @InjectRepository(AlarmSettings)
  ) {}

  @Cron("0 * * * *") // Run every hour
  async scheduleAlarms() {
    this.logger.log("Checking for alarms to schedule...")

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // Get all active alarm settings for the current time
    const alarmSettings = await this.alarmSettingsRepository.find({
      where: {
        isActive: true,
        targetHour: currentHour,
      },
    })

    for (const setting of alarmSettings) {
      // Check if we should trigger the alarm (within the current minute window)
      if (Math.abs(currentMinute - setting.targetMinute) <= 1) {
        await this.triggerAlarm(setting)
      }
    }
  }

  @Cron("0 0 * * *") // Run daily at midnight
  async createDailyWakeUpLogs() {
    this.logger.log("Creating daily wake-up logs...")

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const alarmSettings = await this.alarmSettingsRepository.find({
      where: { isActive: true },
    })

    for (const setting of alarmSettings) {
      // Check if log already exists for today
      const existingLog = await this.wakeUpLogRepository.findOne({
        where: {
          userId: setting.userId,
          date: today,
        },
      })

      if (!existingLog) {
        const targetWakeTime = new Date(today)
        targetWakeTime.setHours(setting.targetHour, setting.targetMinute, 0, 0)

        const wakeUpLog = this.wakeUpLogRepository.create({
          userId: setting.userId,
          date: today,
          targetWakeTime,
          status: "pending",
        })

        await this.wakeUpLogRepository.save(wakeUpLog)
        this.logger.log(`Created wake-up log for user ${setting.userId}`)
      }
    }
  }

  @Cron("0 */10 * * *") // Run every 10 minutes
  async checkMissedAlarms() {
    this.logger.log("Checking for missed alarms...")

    const now = new Date()
    const cutoffTime = new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago

    const missedLogs = await this.wakeUpLogRepository.find({
      where: {
        status: "pending",
      },
    })

    for (const log of missedLogs) {
      const graceWindowEnd = new Date(
        log.targetWakeTime.getTime() + (await this.getGraceWindowForUser(log.userId)) * 60 * 1000,
      )

      if (now > graceWindowEnd) {
        log.status = "missed"
        await this.wakeUpLogRepository.save(log)

        // Reset streak for missed alarm
        await this.alarmStreakService.resetStreak(log.userId, "missed_alarm")

        this.logger.log(`Marked alarm as missed for user ${log.userId}`)
      }
    }
  }

  private async triggerAlarm(setting: AlarmSettings) {
    this.logger.log(`Triggering alarm for user ${setting.userId} at ${setting.targetHour}:${setting.targetMinute}`)

    // Send push notification
    if (setting.enablePushNotifications) {
      await this.notificationService.sendAlarmNotification(setting.userId, {
        title: "⏰ Wake Up!",
        body: "Time to start your day! Respond within 10 minutes to maintain your streak.",
        data: {
          type: "alarm",
          targetTime: `${setting.targetHour}:${setting.targetMinute.toString().padStart(2, "0")}`,
          graceWindow: setting.graceWindowMinutes,
        },
      })
    }

    // Schedule grace window check
    setTimeout(
      async () => {
        await this.checkGraceWindowExpiry(setting.userId)
      },
      setting.graceWindowMinutes * 60 * 1000,
    )
  }

  private async checkGraceWindowExpiry(userId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const log = await this.wakeUpLogRepository.findOne({
      where: {
        userId,
        date: today,
        status: "pending",
      },
    })

    if (log) {
      log.status = "late"
      await this.wakeUpLogRepository.save(log)

      // Reset streak for late response
      await this.alarmStreakService.resetStreak(userId, "late_response")
    }
  }

  private async getGraceWindowForUser(userId: string): Promise<number> {
    const setting = await this.alarmSettingsRepository.findOne({
      where: { userId, isActive: true },
    })
    return setting?.graceWindowMinutes || 10
  }

  async getUpcomingAlarms(userId: string): Promise<{
    nextAlarm: Date | null
    isActive: boolean
    settings: AlarmSettings | null
  }> {
    const setting = await this.alarmSettingsRepository.findOne({
      where: { userId, isActive: true },
    })

    if (!setting) {
      return { nextAlarm: null, isActive: false, settings: null }
    }

    const now = new Date()
    const nextAlarm = new Date()
    nextAlarm.setHours(setting.targetHour, setting.targetMinute, 0, 0)

    // If the alarm time has passed today, set it for tomorrow
    if (nextAlarm <= now) {
      nextAlarm.setDate(nextAlarm.getDate() + 1)
    }

    return {
      nextAlarm,
      isActive: true,
      settings: setting,
    }
  }
}
