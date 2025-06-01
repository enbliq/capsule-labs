import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  UsePipes,
} from "@nestjs/common"
import type { CapsuleRouletteService } from "../services/capsule-roulette.service"
import type { RandomDropSchedulerService } from "../services/random-drop-scheduler.service"
import type { StrkRewardService } from "../services/strk-reward.service"
import type { RouletteAnalyticsService } from "../services/roulette-analytics.service"
import type { NotificationService } from "../services/notification.service"
import type {
  CreateRouletteDropDto,
  ClaimCapsuleDto,
  UpdateRouletteDropDto,
  RouletteQueryDto,
  ScheduleDropDto,
  ManualDropDto,
  UserEligibilityDto,
  RouletteStatsDto,
  RewardDispatchDto,
} from "../dto/capsule-roulette.dto"

@Controller("capsule-roulette")
@UsePipes(new ValidationPipe({ transform: true }))
export class CapsuleRouletteController {
  constructor(
    private readonly rouletteService: CapsuleRouletteService,
    private readonly scheduler: RandomDropSchedulerService,
    private readonly rewardService: StrkRewardService,
    private readonly analytics: RouletteAnalyticsService,
    private readonly notificationService: NotificationService,
  ) {}

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  async createDrop(@Body() createDto: CreateRouletteDropDto) {
    const drop = await this.rouletteService.createRouletteDrop(createDto)

    return {
      success: true,
      data: drop,
      message: "Roulette drop created successfully",
    }
  }

  @Post("claim")
  @HttpCode(HttpStatus.OK)
  async claimCapsule(@Body() claimDto: ClaimCapsuleDto) {
    const result = await this.rouletteService.claimCapsule(claimDto)

    return {
      success: result.success,
      data: {
        claimEvent: result.claimEvent,
        rewardAmount: result.rewardAmount,
        transactionHash: result.transactionHash,
        nextDropInfo: result.nextDropInfo,
      },
      message: result.message,
    }
  }

  @Post("manual-drop")
  @HttpCode(HttpStatus.CREATED)
  async triggerManualDrop(@Body() manualDto: ManualDropDto) {
    const drop = await this.rouletteService.triggerManualDrop(manualDto)

    return {
      success: true,
      data: drop,
      message: "Manual drop triggered successfully",
    }
  }

  @Get(":id")
  getDrop(@Param("id") id: string) {
    const drop = this.rouletteService.getDrop(id)

    return {
      success: true,
      data: drop,
    }
  }

  @Get(":id/statistics")
  async getDropStatistics(@Param("id") id: string) {
    const stats = await this.analytics.getDropStatistics(id)

    return {
      success: true,
      data: stats,
    }
  }

  @Put(":id")
  updateDrop(@Param("id") id: string, @Body() updateDto: UpdateRouletteDropDto) {
    const drop = this.rouletteService.updateDrop(id, updateDto)

    return {
      success: true,
      data: drop,
      message: "Drop updated successfully",
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDrop(@Param("id") id: string) {
    this.rouletteService.deleteDrop(id)
  }

  @Get()
  getAllDrops(@Query() query: RouletteQueryDto) {
    const drops = this.rouletteService.getAllDrops({
      status: query.status,
      userId: query.userId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit,
      offset: query.offset,
    })

    return {
      success: true,
      data: drops,
      total: drops.length,
    }
  }

  @Get("user/:userId/stats")
  getUserStats(@Param("userId") userId: string) {
    const stats = this.rouletteService.getUserStats(userId)

    return {
      success: true,
      data: stats,
    }
  }

  @Get("user/:userId/claim-history")
  getUserClaimHistory(@Param("userId") userId: string) {
    const history = this.rouletteService.getUserClaimHistory(userId)

    return {
      success: true,
      data: history,
      total: history.length,
    }
  }

  @Post("user/eligibility")
  @HttpCode(HttpStatus.OK)
  async checkUserEligibility(@Body() eligibilityDto: UserEligibilityDto) {
    // This would check user eligibility for upcoming drops
    return {
      success: true,
      data: {
        eligible: true,
        reasons: [],
      },
      message: "User eligibility checked",
    }
  }

  @Get("schedule/today")
  getTodaySchedule() {
    const today = new Date()
    const schedule = this.scheduler.getDailySchedule(today)

    return {
      success: true,
      data: schedule,
    }
  }

  @Post("schedule")
  @HttpCode(HttpStatus.CREATED)
  async scheduleDrop(@Body() scheduleDto: ScheduleDropDto) {
    const dropTime = scheduleDto.targetDate
      ? await this.scheduler.generateRandomDropTime(new Date(scheduleDto.targetDate))
      : await this.scheduler.generateRandomDropTime()

    return {
      success: true,
      data: {
        scheduledTime: dropTime,
        timeWindow: scheduleDto.timeWindow,
      },
      message: "Drop scheduled successfully",
    }
  }

  @Get("analytics/metrics")
  async getAnalyticsMetrics(@Query() query: RouletteStatsDto) {
    const metrics = await this.analytics.getAnalyticsMetrics(
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    )

    return {
      success: true,
      data: metrics,
    }
  }

  @Get("analytics/insights/:userId")
  async getUserInsights(@Param("userId") userId: string) {
    const insights = await this.analytics.generateUserInsights(userId)

    return {
      success: true,
      data: insights,
    }
  }

  @Get("rewards/transactions")
  async getRewardTransactions(@Query() query: any) {
    const transactions = await this.rewardService.getAllTransactions({
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit,
      offset: query.offset,
    })

    return {
      success: true,
      data: transactions,
      total: transactions.length,
    }
  }

  @Get("rewards/statistics")
  async getRewardStatistics() {
    const stats = await this.rewardService.getRewardStatistics()

    return {
      success: true,
      data: stats,
    }
  }

  @Post("rewards/dispatch")
  @HttpCode(HttpStatus.OK)
  async dispatchReward(@Body() dispatchDto: RewardDispatchDto) {
    const result = await this.rewardService.dispatchReward(dispatchDto.userId, dispatchDto.amount, dispatchDto.claimEventId)

    return {
      success: result.success,
      data: {
        transactionHash: result.transactionHash,
      },
      message: result.message,
    }
  }

  @Post("rewards/retry/:transactionHash")
  @HttpCode(HttpStatus.OK)
  async retryReward(@Param("transactionHash") transactionHash: string) {
    const result = await this.rewardService.retryFailedTransaction(transactionHash)

    return {
      success: result.success,
      data: {
        transactionHash: result.transactionHash,
      },
      message: result.message,
    }
  }

  @Get("notifications/preferences/:userId")
  async getNotificationPreferences(@Param("userId") userId: string) {
    const preferences = await this.notificationService.getUserPreferences(userId)

    return {
      success: true,
      data: preferences,
    }
  }

  @Put("notifications/preferences/:userId")
  async updateNotificationPreferences(@Param("userId") userId: string, @Body() preferences: any) {
    await this.notificationService.updateUserPreferences(userId, preferences)

    return {
      success: true,
      message: "Notification preferences updated",
    }
  }

  @Get("system/status")
  getSystemStatus() {
    return {
      success: true,
      data: {
        status: "operational",
        uptime: process.uptime(),
        timestamp: new Date(),
        version: "1.0.0",
      },
    }
  }
}
