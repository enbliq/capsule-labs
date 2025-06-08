import { Controller, Get, Post, Body, Query, HttpStatus, HttpCode, BadRequestException } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger"
import type { Repository } from "typeorm"
import type { TimeZoneSettings } from "./entities/multi-time-capsule.entity"
import type { TimeZoneService } from "./services/timezone.service"
import type { UnlockSessionService } from "./services/unlock-session.service"
import type { TimeZoneSettingsDto, AccessAttemptDto } from "./dto/timezone.dto"

@ApiTags("Multi-Time Capsule")
@Controller("multi-time-capsule")
// @UseGuards(JwtAuthGuard) // Uncomment when you have auth setup
export class MultiTimeCapsuleController {
  constructor(
    private settingsRepository: Repository<TimeZoneSettings>,
    private timeZoneService: TimeZoneService,
    private unlockSessionService: UnlockSessionService,
  ) {}

  @Get("timezones")
  @ApiOperation({ summary: "Get all supported time zones" })
  @ApiResponse({ status: 200, description: "Supported time zones retrieved successfully" })
  async getSupportedTimeZones() {
    const timeZones = this.timeZoneService.getSupportedTimeZones()
    const groups = this.timeZoneService.getTimeZoneGroups()

    return {
      success: true,
      data: {
        timeZones,
        groups,
        total: Object.keys(timeZones).length,
      },
    }
  }

  @Get("timezones/current")
  @ApiOperation({ summary: "Get current time in multiple time zones" })
  @ApiQuery({ name: "zones", description: "Comma-separated list of time zones" })
  @ApiResponse({ status: 200, description: "Current times retrieved successfully" })
  async getCurrentTimes(@Query("zones") zones?: string) {
    if (!zones) {
      throw new BadRequestException("Time zones parameter is required")
    }

    const timeZoneList = zones.split(",").map((tz) => tz.trim())
    const invalidZones = timeZoneList.filter((tz) => !this.timeZoneService.validateTimeZone(tz))

    if (invalidZones.length > 0) {
      throw new BadRequestException(`Invalid time zones: ${invalidZones.join(", ")}`)
    }

    const currentTimes = this.timeZoneService.getTimeInMultipleZones(timeZoneList)

    return {
      success: true,
      data: {
        currentTimes,
        requestedAt: new Date(),
      },
    }
  }

  @Get("settings")
  @ApiOperation({ summary: "Get user's time zone settings" })
  @ApiResponse({ status: 200, description: "Time zone settings retrieved successfully" })
  async getSettings(req: any) {
    const userId = req.user?.id || "demo-user"

    const settings = await this.settingsRepository.findOne({
      where: { userId, isActive: true },
    })

    return {
      success: true,
      data: { settings },
    }
  }

  @Post("settings")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update time zone settings" })
  @ApiResponse({ status: 200, description: "Time zone settings updated successfully" })
  async updateSettings(req: any, @Body() settingsDto: TimeZoneSettingsDto) {
    const userId = req.user?.id || "demo-user"

    // Validate time zones
    const invalidZones = settingsDto.timeZones.filter((tz) => !this.timeZoneService.validateTimeZone(tz))
    if (invalidZones.length > 0) {
      throw new BadRequestException(`Invalid time zones: ${invalidZones.join(", ")}`)
    }

    // Deactivate existing settings
    await this.settingsRepository.update({ userId, isActive: true }, { isActive: false })

    // Create new settings
    const newSettings = this.settingsRepository.create({
      userId,
      selectedTimeZones: settingsDto.timeZones,
      targetHour: settingsDto.targetHour,
      isActive: true,
      metadata: {
        timeZoneLabels: settingsDto.timeZones.reduce(
          (acc, tz) => {
            acc[tz] = this.timeZoneService.getSupportedTimeZones()[tz]
            return acc
          },
          {} as Record<string, string>,
        ),
      },
    })

    await this.settingsRepository.save(newSettings)

    return {
      success: true,
      data: { settings: newSettings },
      message: `Time zone settings updated with ${settingsDto.timeZones.length} zones`,
    }
  }

  @Post("session/start")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Start a new unlock session" })
  @ApiResponse({ status: 201, description: "Unlock session started successfully" })
  async startSession(req: any, @Body() body: { timeZones?: string[]; targetHour?: number }) {
    const userId = req.user?.id || "demo-user"

    let timeZones = body.timeZones
    let targetHour = body.targetHour

    // If no time zones provided, use user's settings
    if (!timeZones) {
      const settings = await this.settingsRepository.findOne({
        where: { userId, isActive: true },
      })

      if (!settings) {
        throw new BadRequestException("No time zones specified and no saved settings found")
      }

      timeZones = settings.selectedTimeZones
      targetHour = targetHour || settings.targetHour || undefined
    }

    const result = await this.unlockSessionService.startUnlockSession(userId, timeZones, targetHour)

    return {
      success: true,
      data: result,
      message: `Unlock session started! Target: ${result.session.targetHour}:00 across ${timeZones.length} time zones`,
    }
  }

  @Post("access")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Record access attempt from a time zone" })
  @ApiResponse({ status: 200, description: "Access attempt recorded successfully" })
  async recordAccess(req: any, @Body() accessDto: AccessAttemptDto) {
    const userId = req.user?.id || "demo-user"

    const result = await this.unlockSessionService.recordAccessAttempt(userId, accessDto.timeZone, {
      location: accessDto.location,
      deviceInfo: accessDto.deviceInfo,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    })

    return {
      success: result.success,
      data: {
        attempt: result.attempt,
        sessionStatus: result.sessionStatus,
        capsuleUnlocked: result.capsuleUnlocked,
      },
      message: result.capsuleUnlocked
        ? "🎉 Congratulations! Multi-Time Capsule unlocked!"
        : result.success
          ? `Access recorded for ${accessDto.timeZone}! ${result.sessionStatus?.progress.completed}/${result.sessionStatus?.progress.total} completed.`
          : `Access attempt failed. Current hour (${result.attempt.localHour}) doesn't match target hour.`,
    }
  }

  @Get("session/status")
  @ApiOperation({ summary: "Get current session status" })
  @ApiResponse({ status: 200, description: "Session status retrieved successfully" })
  async getSessionStatus(req: any) {
    const userId = req.user?.id || "demo-user"

    const activeSession = await this.unlockSessionService.getActiveSession(userId)

    if (!activeSession) {
      return {
        success: true,
        data: {
          hasActiveSession: false,
          session: null,
        },
      }
    }

    const status = await this.unlockSessionService.getSessionStatus(userId, activeSession.id)

    return {
      success: true,
      data: {
        hasActiveSession: true,
        ...status,
      },
    }
  }

  @Post("session/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel current unlock session" })
  @ApiResponse({ status: 200, description: "Session cancelled successfully" })
  async cancelSession(req: any) {
    const userId = req.user?.id || "demo-user"

    await this.unlockSessionService.cancelSession(userId)

    return {
      success: true,
      message: "Unlock session cancelled",
    }
  }

  @Get("history")
  @ApiOperation({ summary: "Get user's unlock history" })
  @ApiResponse({ status: 200, description: "Unlock history retrieved successfully" })
  async getUnlockHistory(req: any) {
    const userId = req.user?.id || "demo-user"

    const history = await this.unlockSessionService.getUserUnlockHistory(userId)

    return {
      success: true,
      data: history,
    }
  }

  @Get("check-sync")
  @ApiOperation({ summary: "Check if time zones are synchronized at target hour" })
  @ApiQuery({ name: "zones", description: "Comma-separated list of time zones" })
  @ApiQuery({ name: "hour", description: "Target hour (0-23)", required: false })
  @ApiResponse({ status: 200, description: "Synchronization status retrieved successfully" })
  async checkTimeSync(@Query("zones") zones?: string, @Query("hour") hour?: string) {
    if (!zones) {
      throw new BadRequestException("Time zones parameter is required")
    }

    const timeZoneList = zones.split(",").map((tz) => tz.trim())
    const targetHour = hour ? Number.parseInt(hour) : undefined

    if (targetHour !== undefined && (targetHour < 0 || targetHour > 23)) {
      throw new BadRequestException("Hour must be between 0 and 23")
    }

    const syncCheck = this.timeZoneService.checkSameHourAcrossZones(timeZoneList, targetHour)

    return {
      success: true,
      data: {
        ...syncCheck,
        canUnlock: syncCheck.allSameHour,
        targetHour: targetHour || syncCheck.commonHour,
      },
    }
  }

  @Get("optimal-times")
  @ApiOperation({ summary: "Get optimal access times for time zones" })
  @ApiQuery({ name: "zones", description: "Comma-separated list of time zones" })
  @ApiQuery({ name: "hour", description: "Target hour (0-23)" })
  @ApiResponse({ status: 200, description: "Optimal access times retrieved successfully" })
  async getOptimalTimes(@Query("zones") zones?: string, @Query("hour") hour?: string) {
    if (!zones || !hour) {
      throw new BadRequestException("Both zones and hour parameters are required")
    }

    const timeZoneList = zones.split(",").map((tz) => tz.trim())
    const targetHour = Number.parseInt(hour)

    if (targetHour < 0 || targetHour > 23) {
      throw new BadRequestException("Hour must be between 0 and 23")
    }

    const optimalTimes = this.timeZoneService.getOptimalAccessTimes(timeZoneList, targetHour)

    return {
      success: true,
      data: {
        targetHour,
        optimalTimes,
        generatedAt: new Date(),
      },
    }
  }
}
