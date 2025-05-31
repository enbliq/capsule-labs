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
import type { TimeLoopCapsuleService } from "../services/time-loop-capsule.service"
import type { StreakManagementService } from "../services/streak-management.service"
import type { CapsuleStateMachineService } from "../services/capsule-state-machine.service"
import type {
  CreateTimeLoopCapsuleDto,
  SubmitTaskDto,
  UpdateTimeLoopCapsuleDto,
  TimeLoopQueryDto,
  ManualStateChangeDto,
  MakeupTaskDto,
} from "../dto/time-loop-capsule.dto"

@Controller("time-loop-capsule")
@UsePipes(new ValidationPipe({ transform: true }))
export class TimeLoopCapsuleController {
  constructor(
    private readonly timeLoopCapsuleService: TimeLoopCapsuleService,
    private readonly streakManagement: StreakManagementService,
    private readonly stateMachine: CapsuleStateMachineService,
  ) {}

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  async createCapsule(@Body() createDto: CreateTimeLoopCapsuleDto) {
    const capsule = await this.timeLoopCapsuleService.createTimeLoopCapsule(createDto)

    return {
      success: true,
      data: capsule,
      message: "Time loop capsule created successfully",
    }
  }

  @Post("submit-task")
  @HttpCode(HttpStatus.OK)
  async submitTask(@Body() submitDto: SubmitTaskDto) {
    const result = await this.timeLoopCapsuleService.submitTask(submitDto)

    return {
      success: result.success,
      data: result.progress,
      message: result.message,
    }
  }

  @Post("submit-makeup-task")
  @HttpCode(HttpStatus.OK)
  async submitMakeupTask(@Body() makeupDto: MakeupTaskDto) {
    const result = await this.timeLoopCapsuleService.submitMakeupTask(makeupDto)

    return {
      success: result.success,
      message: result.message,
    }
  }

  @Get(":id")
  getCapsule(@Param("id") id: string) {
    const capsule = this.timeLoopCapsuleService.getCapsule(id)

    return {
      success: true,
      data: capsule,
    }
  }

  @Get(":id/progress/:userId")
  getUserProgress(@Param("id") capsuleId: string, @Param("userId") userId: string) {
    const progress = this.timeLoopCapsuleService.getUserProgress(capsuleId, userId)

    if (!progress) {
      return {
        success: false,
        message: "No progress found for this user",
      }
    }

    const streakStats = this.streakManagement.getStreakStatistics(progress)

    return {
      success: true,
      data: {
        progress,
        streakStatistics: streakStats,
      },
    }
  }

  @Get(":id/state-history")
  getStateHistory(@Param("id") id: string) {
    const capsule = this.timeLoopCapsuleService.getCapsule(id)
    const history = this.stateMachine.getStateTransitionHistory(capsule)

    return {
      success: true,
      data: history,
    }
  }

  @Put(":id")
  updateCapsule(@Param("id") id: string, @Body() updateDto: UpdateTimeLoopCapsuleDto) {
    const capsule = this.timeLoopCapsuleService.updateCapsule(id, updateDto)

    return {
      success: true,
      data: capsule,
      message: "Capsule updated successfully",
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCapsule(@Param("id") id: string) {
    this.timeLoopCapsuleService.deleteCapsule(id)
  }

  @Get()
  getAllCapsules(@Query() query: TimeLoopQueryDto) {
    const capsules = this.timeLoopCapsuleService.getAllCapsules({
      createdBy: query.createdBy,
      permanentlyUnlocked: query.permanentlyUnlocked,
      isActive: query.isActive,
      state: query.state,
      limit: query.limit,
      offset: query.offset,
    })

    return {
      success: true,
      data: capsules,
      total: capsules.length,
    }
  }

  @Get("user/:userId/capsules")
  getUserCapsules(@Param("userId") userId: string) {
    const capsules = this.timeLoopCapsuleService.getUserCapsules(userId)

    return {
      success: true,
      data: capsules,
      total: capsules.length,
    }
  }

  @Get(":id/statistics")
  getCapsuleStatistics(@Param("id") id: string) {
    const stats = this.timeLoopCapsuleService.getCapsuleStatistics(id)

    return {
      success: true,
      data: stats,
    }
  }

  @Post(":id/manual-state-change")
  @HttpCode(HttpStatus.OK)
  manualStateChange(@Param("id") id: string, @Body() stateChangeDto: ManualStateChangeDto) {
    const capsule = this.timeLoopCapsuleService.getCapsule(id)

    const success = this.stateMachine.transitionState(
      capsule,
      stateChangeDto.newState as any,
      "manual_override" as any,
      stateChangeDto.reason,
      { manual: true },
      stateChangeDto.userId,
    )

    return {
      success,
      message: success ? "State changed successfully" : "Invalid state transition",
      data: {
        currentState: capsule.currentState,
        availableTransitions: this.stateMachine.getAvailableTransitions(capsule),
      },
    }
  }

  @Post("daily-reset")
  @HttpCode(HttpStatus.OK)
  async triggerDailyReset() {
    const results = await this.timeLoopCapsuleService.performDailyReset()

    return {
      success: true,
      data: results,
      message: `Daily reset completed for ${results.length} capsules`,
    }
  }
}
