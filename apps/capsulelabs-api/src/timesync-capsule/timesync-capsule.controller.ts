import { Controller, Get, Post, Body, Query, HttpStatus, HttpCode } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import type { SyncValidatorService } from "./services/sync-validator.service"
import type { TimeServerService } from "./services/time-server.service"
import type { PulseBroadcasterService } from "./services/pulse-broadcaster.service"
import type { SyncAttemptDto } from "./dto/timesync.dto"

@ApiTags("TimeSync Capsule")
@Controller("timesync-capsule")
// @UseGuards(JwtAuthGuard) // Uncomment when you have auth setup
export class TimeSyncCapsuleController {
  constructor(
    private readonly syncValidatorService: SyncValidatorService,
    private readonly timeServerService: TimeServerService,
    private readonly pulseBroadcasterService: PulseBroadcasterService,
  ) {}

  @Get("time")
  @ApiOperation({ summary: "Get current server time with NTP correction" })
  @ApiResponse({ status: 200, description: "Server time retrieved successfully" })
  async getServerTime() {
    const serverTime = this.timeServerService.getCurrentTime()
    const nextPulseInfo = await this.pulseBroadcasterService.getNextPulseInfo()

    return {
      success: true,
      data: {
        ...serverTime,
        nextPulse: nextPulseInfo,
        ntpStatus: this.timeServerService.getNTPStatus(),
      },
    }
  }

  @Post("sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Attempt to sync with a pulse" })
  @ApiResponse({ status: 200, description: "Sync attempt processed" })
  @ApiResponse({ status: 404, description: "Pulse not found" })
  async attemptSync(req: any, @Body() syncAttemptDto: SyncAttemptDto) {
    const userId = req.user?.id || "demo-user"

    const result = await this.syncValidatorService.processSyncAttempt(userId, syncAttemptDto)

    return {
      success: result.success,
      data: result,
      message: result.message,
    }
  }

  @Get("status")
  @ApiOperation({ summary: "Get user's TimeSync capsule status" })
  @ApiResponse({ status: 200, description: "Capsule status retrieved successfully" })
  async getCapsuleStatus(req: any) {
    const userId = req.user?.id || "demo-user"

    const hasUnlocked = await this.syncValidatorService.hasUserUnlockedCapsule(userId)
    const history = await this.syncValidatorService.getUserSyncHistory(userId, 5)
    const bestSync = await this.syncValidatorService.getUserBestSync(userId)
    const activePulse = this.pulseBroadcasterService.getActivePulse()
    const nextPulseInfo = await this.pulseBroadcasterService.getNextPulseInfo()

    return {
      success: true,
      data: {
        hasUnlockedCapsule: hasUnlocked,
        activePulse,
        nextPulse: nextPulseInfo,
        recentHistory: history.attempts.slice(0, 5),
        bestSync,
        stats: history.stats,
      },
    }
  }

  @Get("history")
  @ApiOperation({ summary: "Get user's sync attempt history" })
  @ApiResponse({ status: 200, description: "Sync history retrieved successfully" })
  async getSyncHistory(req: any, @Query("limit") limit: string = "20") {
    const userId = req.user?.id || "demo-user"
    const limitNum = Number.parseInt(limit)

    const history = await this.syncValidatorService.getUserSyncHistory(userId, limitNum)

    return {
      success: true,
      data: history,
    }
  }

  @Get("pulse/active")
  @ApiOperation({ summary: "Get currently active sync pulse" })
  @ApiResponse({ status: 200, description: "Active pulse retrieved successfully" })
  async getActivePulse() {
    const activePulse = this.pulseBroadcasterService.getActivePulse()

    return {
      success: true,
      data: {
        activePulse,
        serverTime: this.timeServerService.getCurrentTime().serverTime,
      },
    }
  }

  @Get("pulse/next")
  @ApiOperation({ summary: "Get next scheduled pulse information" })
  @ApiResponse({ status: 200, description: "Next pulse info retrieved successfully" })
  async getNextPulse() {
    const nextPulseInfo = await this.pulseBroadcasterService.getNextPulseInfo()

    return {
      success: true,
      data: {
        ...nextPulseInfo,
        serverTime: this.timeServerService.getCurrentTime().serverTime,
      },
    }
  }

  @Post("pulse/custom")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Schedule a custom sync pulse (admin only)" })
  @ApiResponse({ status: 201, description: "Custom pulse scheduled successfully" })
  async scheduleCustomPulse(
    @Body() data: { 
      scheduledTime: string
      description?: string
      windowMs?: number 
    }
  ) {
    const scheduledTime = new Date(data.scheduledTime)
    const description = data.description || "Custom Sync Pulse"
    const windowMs = data.windowMs || 3000

    const pulse = await this.pulseBroadcasterService.scheduleCustomPulse(
      scheduledTime,
      description,
      windowMs
    )

    return {
      success: true,
      data: { pulse },
      message: `Custom pulse scheduled for ${scheduledTime.toISOString()}`,
    }
  }

  @Get("stats/global")
  @ApiOperation({ summary: "Get global sync statistics" })
  @ApiResponse({ status: 200, description: "Global statistics retrieved successfully" })
  async getGlobalStats(@Query("days") days: string = "7") {
    const daysNum = Number.parseInt(days)

    const globalStats = await this.syncValidatorService.getGlobalSyncStats(daysNum)
    const pulseStats = await this.pulseBroadcasterService.getPulseStatistics(daysNum)

    return {
      success: true,
      data: {
        sync: globalStats,
        pulses: pulseStats,
        serverTime: this.timeServerService.getCurrentTime().serverTime,
      },
    }
  }

  @Post("ntp/sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Perform NTP time synchronization" })
  @ApiResponse({ status: 200, description: "NTP sync completed" })
  async performNTPSync(
    @Body() data: {
      clientSentTime: string
      clientReceivedTime: string
    }
  ) {
    const serverReceivedTime = new Date()
    const ntpResult = await this.timeServerService.performNTPSync(
      new Date(data.clientSentTime),
      serverReceivedTime
    )

    return {
      success: true,
      data: {
        ntpResult,
        serverTime: this.timeServerService.getCurrentTime(),
      },
      message: `NTP sync completed. Clock offset: ${ntpResult.clockOffset}ms`,
    }
  }

  @Get("debug/time-drift")
  @ApiOperation({ summary: "Check for time drift (debug endpoint)" })
  @ApiResponse({ status: 200, description: "Time drift information retrieved" })
  async checkTimeDrift() {
    const serverTime = this.timeServerService.getCurrentTime()
    const ntpStatus = this.timeServerService.getNTPStatus()
    const highPrecisionTime = this.timeServerService.getHighPrecisionTimestamp()

    return {
      success: true,
      data: {
        serverTime,
        ntpStatus,
        highPrecisionTime,
        systemTime: new Date(),
        performanceNow: typeof performance !== "undefined" ? performance.now() : null,
      },
    }
  }
}
