import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { UserSenseProgress } from "../entities/sense-task.entity"
import type { TaskGeneratorService } from "./task-generator.service"
import type { SensorHandlerService } from "./sensor-handler.service"
import type { CompleteTaskDto } from "../dto/sense-task.dto"

@Injectable()
export class ProgressTrackerService {
  private readonly logger = new Logger(ProgressTrackerService.name);

  constructor(
    @InjectRepository(UserSenseProgress)
    private readonly progressRepository: Repository<UserSenseProgress>,
    private readonly taskGeneratorService: TaskGeneratorService,
    private readonly sensorHandlerService: SensorHandlerService,
  ) {}

  async getDailyProgress(userId: string, date: Date = new Date()): Promise<UserSenseProgress> {
    const dateString = date.toISOString().split("T")[0]

    let progress = await this.progressRepository.findOne({
      where: {
        userId,
        date: new Date(dateString),
      },
    })

    if (!progress) {
      // Generate new daily tasks
      const dailyTasks = await this.taskGeneratorService.generateDailyTasks(userId, date)

      progress = this.progressRepository.create({
        userId,
        date: new Date(dateString),
        dailyTasks,
        capsuleUnlocked: false,
      })

      await this.progressRepository.save(progress)
      this.logger.log(`Created new daily progress for user ${userId}`)
    }

    return progress
  }

  async completeTask(
    userId: string,
    completeTaskDto: CompleteTaskDto,
  ): Promise<{
    success: boolean
    progress: UserSenseProgress
    capsuleUnlocked: boolean
  }> {
    const { taskId, taskData } = completeTaskDto
    const progress = await this.getDailyProgress(userId)

    // Find the task in daily tasks
    const taskIndex = progress.dailyTasks.findIndex((task) => task.taskId === taskId)
    if (taskIndex === -1) {
      throw new NotFoundException("Task not found in daily tasks")
    }

    const task = progress.dailyTasks[taskIndex]
    if (task.completed) {
      return {
        success: true,
        progress,
        capsuleUnlocked: progress.capsuleUnlocked,
      }
    }

    // Validate task completion using sensor handler
    const isValid = await this.sensorHandlerService.validateTaskCompletion(task.taskType, taskData, task.metadata || {})

    if (!isValid) {
      this.logger.warn(`Task validation failed for user ${userId}, task ${taskId}`)
      return {
        success: false,
        progress,
        capsuleUnlocked: false,
      }
    }

    // Mark task as completed
    progress.dailyTasks[taskIndex] = {
      ...task,
      completed: true,
      completedAt: new Date(),
      taskData,
    }

    // Check if all tasks are completed
    const allCompleted = progress.dailyTasks.every((t) => t.completed)
    let capsuleUnlocked = false

    if (allCompleted && !progress.capsuleUnlocked) {
      progress.capsuleUnlocked = true
      progress.capsuleUnlockedAt = new Date()
      capsuleUnlocked = true
      this.logger.log(`🎉 Capsule unlocked for user ${userId}!`)
    }

    await this.progressRepository.save(progress)

    return {
      success: true,
      progress,
      capsuleUnlocked,
    }
  }

  async getProgressStats(userId: string): Promise<{
    totalDays: number
    completedDays: number
    currentStreak: number
    longestStreak: number
    totalTasksCompleted: number
    senseBreakdown: Record<string, number>
  }> {
    const allProgress = await this.progressRepository.find({
      where: { userId },
      order: { date: "ASC" },
    })

    const totalDays = allProgress.length
    const completedDays = allProgress.filter((p) => p.capsuleUnlocked).length

    // Calculate streaks
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    for (let i = allProgress.length - 1; i >= 0; i--) {
      if (allProgress[i].capsuleUnlocked) {
        tempStreak++
        if (i === allProgress.length - 1) {
          currentStreak = tempStreak
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 0
        if (currentStreak === 0) {
          break
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak)

    // Calculate total tasks and sense breakdown
    let totalTasksCompleted = 0
    const senseBreakdown: Record<string, number> = {}

    allProgress.forEach((progress) => {
      progress.dailyTasks.forEach((task) => {
        if (task.completed) {
          totalTasksCompleted++
          senseBreakdown[task.sense] = (senseBreakdown[task.sense] || 0) + 1
        }
      })
    })

    return {
      totalDays,
      completedDays,
      currentStreak,
      longestStreak,
      totalTasksCompleted,
      senseBreakdown,
    }
  }

  async resetDailyProgress(userId: string, date: Date = new Date()): Promise<void> {
    const dateString = date.toISOString().split("T")[0]

    await this.progressRepository.delete({
      userId,
      date: new Date(dateString),
    })

    this.logger.log(`Reset daily progress for user ${userId} on ${dateString}`)
  }
}
