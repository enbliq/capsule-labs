import { Controller, Get, Post, Body, Query, HttpStatus, HttpCode, BadRequestException } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { AlarmSettings } from "./entities/alarm-capsule.entity"
import type { AlarmSchedulerService } from "./services/alarm-scheduler.service"
import type { AlarmStreakService } from "./services/alarm-streak.service"
import type { WakeUpTrackerService } from "./services/wake-up-tracker.service"
import type { NotificationService } from "./services/notification.service"
import type { AlarmSettingsDto, WakeUpLogDto, AlarmResponseDto } from "./dto/alarm-settings.dto"

@ApiTags("Alarm Capsule")
@Controller("alarm-capsule")
// @UseGuards(JwtAuthGuard) // Uncomment when you have auth setup
export class AlarmCapsuleController {
  constructor(
    private alarmSettingsRepository: Repository<AlarmSettings>,
    private alarmSchedulerService: AlarmSchedulerService,
    private alarmStreakService: AlarmStreakService,
    private wakeUpTrackerService: WakeUpTrackerService,
    private notificationService: NotificationService,
    @InjectRepository(AlarmSettings)
  ) {}

  @Get("settings")
  @ApiOperation({ summary: "Get user's alarm settings" })
  @ApiResponse({ status: 200, description: "Alarm settings retrieved successfully" })
  async getAlarmSettings(req: any) {
    const userId = req.user?.id || "demo-user"

    const settings = await this.alarmSettingsRepository.findOne({
      where: { userId, isActive: true },
    })

    const upcomingAlarms = await this.alarmSchedulerService.getUpcomingAlarms(userId)

    return {
      success: true,
      data: {
        settings,
        nextAlarm: upcomingAlarms.nextAlarm,
        isActive: upcomingAlarms.isActive,
      },
    }
  }

  @Post("settings")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Create or update alarm settings" })
  @ApiResponse({ status: 200, description: "Alarm settings updated successfully" })
  async updateAlarmSettings(req: any, @Body() settingsDto: AlarmSettingsDto) {
    const userId = req.user?.id || "demo-user"

    // Validate time format
    if (settingsDto.targetHour < 0 || settingsDto.targetHour > 23) {
      throw new BadRequestException("Target hour must be between 0 and 23")
    }
    if (settingsDto.targetMinute < 0 || settingsDto.targetMinute > 59) {
      throw new BadRequestException("Target minute must be between 0 and 59")
    }

    // Deactivate existing settings
    await this.alarmSettingsRepository.update({ userId, isActive: true }, { isActive: false })

    // Create new settings
    const newSettings = this.alarmSettingsRepository.create({
      userId,
      ...settingsDto,
      isActive: true,
    })

    await this.alarmSettingsRepository.save(newSettings)

    const upcomingAlarms = await this.alarmSchedulerService.getUpcomingAlarms(userId)

    return {
      success: true,
      data: {
        settings: newSettings,
        nextAlarm: upcomingAlarms.nextAlarm,
      },
      message: `Alarm set for ${settingsDto.targetHour}:${settingsDto.targetMinute.toString().padStart(2, "0")}`,
    }
  }

  @Post("wake-up")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log wake-up time" })
  @ApiResponse({ status: 200, description: "Wake-up logged successfully" })
  async logWakeUp(req: any, @Body() wakeUpDto: WakeUpLogDto) {
    const userId = req.user?.id || "demo-user"

    const result = await this.wakeUpTrackerService.logWakeUp(userId, wakeUpDto)

    return {
      success: result.success,
      data: {
        status: result.status,
        minutesLate: result.minutesLate,
        streakUpdated: result.streakUpdated,
        capsuleUnlocked: result.capsuleUnlocked,
      },
      message: result.capsuleUnlocked
        ? "🎉 Congratulations! You've unlocked the Alarm Capsule!"
        : result.status === "on_time"
          ? "Great job waking up on time!"
          : `You woke up ${result.minutesLate} minutes late. Your streak has been reset.`,
    }
  }

  @Post("alarm-response")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Handle alarm response (dismiss/snooze)" })
  @ApiResponse({ status: 200, description: "Alarm response handled successfully" })
  async handleAlarmResponse(req: any, @Body() responseDto: AlarmResponseDto) {
    const userId = req.user?.id || "demo-user"

    const result = await this.wakeUpTrackerService.handleAlarmResponse(userId, responseDto)

    return {
      success: result.success,
      data: {
        action: result.action,
        nextAlarmTime: result.nextAlarmTime,
      },
      message: result.action === "snooze" ? `Alarm snoozed. Next alarm in 5 minutes.` : "Alarm dismissed successfully!",
    }
  }

  @Get("status")
  @ApiOperation({ summary: "Get today's wake-up status" })
  @ApiResponse({ status: 200, description: "Wake-up status retrieved successfully" })
  async getTodaysStatus(req: any) {
    const userId = req.user?.id || "demo-user"

    const status = await this.wakeUpTrackerService.getTodaysWakeUpStatus(userId)
    const streakStats = await this.alarmStreakService.getStreakStats(userId)

    return {
      success: true,
      data: {
        today: status,
        streak: {
          current: streakStats.currentStreak,
          longest: streakStats.longestStreak,
          daysUntilUnlock: streakStats.daysUntilUnlock,
          capsuleUnlocked: streakStats.capsuleUnlocked,
        },
      },
    }
  }

  @Get("streak")
  @ApiOperation({ summary: "Get streak statistics" })
  @ApiResponse({ status: 200, description: "Streak statistics retrieved successfully" })
  async getStreakStats(req: any) {
    const userId = req.user?.id || "demo-user"

    const stats = await this.alarmStreakService.getStreakStats(userId)

    return {
      success: true,
      data: stats,
    }
  }

  @Get("history")
  @ApiOperation({ summary: "Get wake-up history" })
  @ApiResponse({ status: 200, description: "Wake-up history retrieved successfully" })
  async getWakeUpHistory(req: any, @Query("days") days?: string) {
    const userId = req.user?.id || "demo-user"
    const historyDays = days ? Number.parseInt(days) : 30

    const history = await this.wakeUpTrackerService.getWakeUpHistory(userId, historyDays)

    return {
      success: true,
      data: {
        history,
        totalDays: history.length,
        successfulDays: history.filter((log) => log.status === "on_time").length,
      },
    }
  }

  @Post("notifications/register")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Register device for push notifications" })
  @ApiResponse({ status: 200, description: "Device registered successfully" })
  async registerDevice(req: any, @Body() body: { token: string; platform: "ios" | "android" | "web" }) {
    const userId = req.user?.id || "demo-user"

    await this.notificationService.registerDeviceToken(userId, body.token, body.platform)

    return {
      success: true,
      message: "Device registered for push notifications",
    }
  }

  @Post("test-alarm")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Test alarm notification (debug)" })
  @ApiResponse({ status: 200, description: "Test alarm sent successfully" })
  async testAlarm(req: any) {
    const userId = req.user?.id || "demo-user"

    await this.notificationService.sendAlarmNotification(userId, {
      title: "🧪 Test Alarm",
      body: "This is a test alarm notification. Your actual alarm is working!",
      data: {
        type: "test_alarm",
        timestamp: new Date().toISOString(),
      },
    })

    return {
      success: true,
      message: "Test alarm notification sent",
    }
  }
}
