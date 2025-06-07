import { Controller, Get, Post, Body, Query, HttpStatus, HttpCode } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import type { ProgressTrackerService } from "./services/progress-tracker.service"
import type { CompleteTaskDto } from "./dto/sense-task.dto"

@ApiTags("Five Senses Capsule")
@Controller("capsules/five-senses")
// @UseGuards(JwtAuthGuard) // Uncomment when you have auth setup
export class CapsulesController {
  constructor(private progressTrackerService: ProgressTrackerService) {}

  @Get("daily-tasks")
  @ApiOperation({ summary: "Get daily sense tasks for user" })
  @ApiResponse({ status: 200, description: "Daily tasks retrieved successfully" })
  async getDailyTasks(req: any, @Query('date') date?: string) {
    const userId = req.user?.id || "demo-user" // Replace with actual user ID from auth
    const taskDate = date ? new Date(date) : new Date()

    const progress = await this.progressTrackerService.getDailyProgress(userId, taskDate)

    return {
      success: true,
      data: {
        date: progress.date,
        tasks: progress.dailyTasks,
        capsuleUnlocked: progress.capsuleUnlocked,
        completedTasks: progress.dailyTasks.filter((t) => t.completed).length,
        totalTasks: progress.dailyTasks.length,
      },
    }
  }

  @Post("complete-task")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete a sense task" })
  @ApiResponse({ status: 200, description: "Task completed successfully" })
  @ApiResponse({ status: 400, description: "Invalid task data" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async completeTask(req: any, @Body() completeTaskDto: CompleteTaskDto) {
    const userId = req.user?.id || "demo-user" // Replace with actual user ID from auth

    const result = await this.progressTrackerService.completeTask(userId, completeTaskDto)

    return {
      success: result.success,
      data: {
        taskCompleted: result.success,
        capsuleUnlocked: result.capsuleUnlocked,
        progress: {
          completedTasks: result.progress.dailyTasks.filter((t) => t.completed).length,
          totalTasks: result.progress.dailyTasks.length,
          allTasksCompleted: result.progress.dailyTasks.every((t) => t.completed),
        },
      },
      message: result.capsuleUnlocked
        ? "🎉 Congratulations! You've unlocked the Five Senses Capsule!"
        : result.success
          ? "Task completed successfully!"
          : "Task validation failed",
    }
  }

  @Get("progress")
  @ApiOperation({ summary: "Get user progress statistics" })
  @ApiResponse({ status: 200, description: "Progress statistics retrieved successfully" })
  async getProgress(req: any) {
    const userId = req.user?.id || "demo-user" // Replace with actual user ID from auth

    const stats = await this.progressTrackerService.getProgressStats(userId)

    return {
      success: true,
      data: stats,
    }
  }

  @Post("reset-daily")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset daily progress (admin/debug)" })
  @ApiResponse({ status: 200, description: "Daily progress reset successfully" })
  async resetDaily(req: any, @Query('date') date?: string) {
    const userId = req.user?.id || "demo-user" // Replace with actual user ID from auth
    const resetDate = date ? new Date(date) : new Date()

    await this.progressTrackerService.resetDailyProgress(userId, resetDate)

    return {
      success: true,
      message: "Daily progress reset successfully",
    }
  }
}
