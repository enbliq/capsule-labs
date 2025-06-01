import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common"
import type {
  TimeLoopCapsule,
  UserProgress,
  TaskSubmission,
  DailyResetResult,
  StreakCheckResult,
} from "../entities/time-loop-capsule.entity"
import { CapsuleState, StateTransitionTrigger } from "../entities/time-loop-capsule.entity"
import type {
  CreateTimeLoopCapsuleDto,
  SubmitTaskDto,
  UpdateTimeLoopCapsuleDto,
  MakeupTaskDto,
} from "../dto/time-loop-capsule.dto"
import type { DailyTaskService } from "./daily-task.service"
import type { StreakManagementService } from "./streak-management.service"
import type { CapsuleStateMachineService } from "./capsule-state-machine.service"

@Injectable()
export class TimeLoopCapsuleService {
  private readonly logger = new Logger(TimeLoopCapsuleService.name)
  private capsules = new Map<string, TimeLoopCapsule>()

  constructor(
    private readonly dailyTaskService: DailyTaskService,
    private readonly streakManagement: StreakManagementService,
    private readonly stateMachine: CapsuleStateMachineService,
  ) {}

  async createTimeLoopCapsule(createDto: CreateTimeLoopCapsuleDto): Promise<TimeLoopCapsule> {
    // Validate configuration
    this.validateCapsuleConfig(createDto)

    const capsuleId = this.generateCapsuleId()
    const capsule: TimeLoopCapsule = {
      id: capsuleId,
      title: createDto.title,
      description: createDto.description,
      reward: createDto.reward,
      createdBy: createDto.createdBy,
      createdAt: new Date(),
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : undefined,

      loopConfig: createDto.loopConfig,
      taskConfig: createDto.taskConfig,

      currentState: CapsuleState.LOCKED,
      stateHistory: [],
      userProgress: new Map(),
      permanentlyUnlocked: false,
      isActive: true,
    }

    // Initialize state machine
    this.stateMachine.initializeCapsule(capsule)

    this.capsules.set(capsuleId, capsule)

    this.logger.log(`Created time loop capsule ${capsuleId} with ${createDto.taskConfig.dailyTasks.length} daily tasks`)
    return capsule
  }

  async submitTask(submitDto: SubmitTaskDto): Promise<{ success: boolean; message: string; progress?: UserProgress }> {
    const { capsuleId, taskId, userId, submissionData } = submitDto

    const capsule = this.capsules.get(capsuleId)
    if (!capsule) {
      throw new NotFoundException(`Capsule with ID ${capsuleId} not found`)
    }

    if (!capsule.isActive) {
      throw new BadRequestException("This capsule is no longer active")
    }

    if (capsule.expiresAt && new Date() > capsule.expiresAt) {
      throw new BadRequestException("This capsule has expired")
    }

    if (capsule.permanentlyUnlocked) {
      return {
        success: false,
        message: "This capsule has been permanently unlocked and no longer requires daily tasks",
      }
    }

    // Check if capsule is in a state that allows task submission
    if (![CapsuleState.UNLOCKED, CapsuleState.GRACE_PERIOD].includes(capsule.currentState)) {
      return {
        success: false,
        message: `Cannot submit tasks when capsule is in ${capsule.currentState} state`,
      }
    }

    // Get or create user progress
    let userProgress = capsule.userProgress.get(userId)
    if (!userProgress) {
      userProgress = this.initializeUserProgress(userId)
      capsule.userProgress.set(userId, userProgress)
    }

    // Check if task was already completed today
    const today = this.getTodayDateString()
    const todayCompletion = userProgress.currentDayTasks.find((completion) => completion.taskId === taskId)
    if (todayCompletion) {
      return {
        success: false,
        message: "This task has already been completed today",
        progress: userProgress,
      }
    }

    // Validate and process task submission
    const taskSubmission: TaskSubmission = {
      taskId,
      userId,
      submissionData,
      submittedAt: new Date(),
      deviceInfo: submitDto.deviceInfo,
    }

    const validationResult = await this.dailyTaskService.validateTaskSubmission(
      capsule.taskConfig.dailyTasks.find((t) => t.id === taskId)!,
      taskSubmission,
    )

    if (!validationResult.isValid) {
      return {
        success: false,
        message: `Task validation failed: ${validationResult.feedback}`,
        progress: userProgress,
      }
    }

    // Record task completion
    const taskCompletion = {
      taskId,
      completedAt: new Date(),
      submissionData,
      points: validationResult.score,
      isValid: true,
      validationResult,
    }

    userProgress.currentDayTasks.push(taskCompletion)

    // Check if all required tasks for today are completed
    const completionResult = this.checkDailyCompletion(capsule, userProgress)

    if (completionResult.dayCompleted) {
      // Update streak and check for permanent unlock
      const streakResult = this.streakManagement.updateStreak(userProgress, capsule.loopConfig)

      if (streakResult.eligibleForPermanentUnlock) {
        await this.handlePermanentUnlock(capsule, userId)
      }

      this.logger.log(`User ${userId} completed daily tasks for capsule ${capsuleId}`)
    }

    return {
      success: true,
      message: completionResult.dayCompleted
        ? "Daily tasks completed! Streak updated."
        : `Task completed. ${completionResult.remainingTasks} tasks remaining today.`,
      progress: userProgress,
    }
  }

  async submitMakeupTask(makeupDto: MakeupTaskDto): Promise<{ success: boolean; message: string }> {
    const { capsuleId, userId, missedDate, taskId, submissionData } = makeupDto

    const capsule = this.capsules.get(capsuleId)
    if (!capsule) {
      throw new NotFoundException(`Capsule with ID ${capsuleId} not found`)
    }

    if (!capsule.loopConfig.allowMakeupTasks) {
      return {
        success: false,
        message: "Makeup tasks are not allowed for this capsule",
      }
    }

    const userProgress = capsule.userProgress.get(userId)
    if (!userProgress) {
      return {
        success: false,
        message: "User has no progress record for this capsule",
      }
    }

    // Validate makeup task opportunity
    const makeupOpportunity = this.dailyTaskService.getMakeupTaskOpportunity(
      userProgress,
      new Date(missedDate),
      capsule.loopConfig,
    )

    if (!makeupOpportunity) {
      return {
        success: false,
        message: "No makeup task opportunity available for this date",
      }
    }

    // Process makeup task submission
    const taskSubmission: TaskSubmission = {
      taskId,
      userId,
      submissionData,
      submittedAt: new Date(),
    }

    const task = capsule.taskConfig.dailyTasks.find((t) => t.id === taskId)
    if (!task) {
      return {
        success: false,
        message: "Invalid task ID",
      }
    }

    const validationResult = await this.dailyTaskService.validateTaskSubmission(task, taskSubmission)

    if (!validationResult.isValid) {
      return {
        success: false,
        message: `Makeup task validation failed: ${validationResult.feedback}`,
      }
    }

    // Apply makeup task with penalty
    const penaltyPoints = Math.floor(validationResult.score * (1 - makeupOpportunity.penaltyPoints / 100))

    // Update user progress with makeup completion
    this.streakManagement.applyMakeupTask(userProgress, new Date(missedDate), penaltyPoints)

    this.logger.log(`User ${userId} completed makeup task for ${missedDate} in capsule ${capsuleId}`)

    return {
      success: true,
      message: `Makeup task completed with ${makeupOpportunity.penaltyPoints}% penalty applied`,
    }
  }

  async performDailyReset(): Promise<DailyResetResult[]> {
    const results: DailyResetResult[] = []

    for (const capsule of this.capsules.values()) {
      if (!capsule.isActive || capsule.permanentlyUnlocked) {
        continue
      }

      const resetResult = await this.performCapsuleDailyReset(capsule)
      if (resetResult) {
        results.push(resetResult)
      }
    }

    this.logger.log(`Performed daily reset for ${results.length} capsules`)
    return results
  }

  private async performCapsuleDailyReset(capsule: TimeLoopCapsule): Promise<DailyResetResult | null> {
    const affectedUsers: string[] = []
    let newState = capsule.currentState

    // Check each user's progress
    for (const [userId, userProgress] of capsule.userProgress.entries()) {
      const streakCheck = this.checkUserStreakStatus(userProgress, capsule)

      if (streakCheck.streakBroken) {
        affectedUsers.push(userId)

        // Reset user progress if too many days missed
        if (userProgress.missedDays.length >= capsule.loopConfig.maxMissedDaysBeforeReset) {
          this.resetUserProgress(userProgress)
          this.logger.log(`Reset progress for user ${userId} due to too many missed days`)
        }
      }

      // Reset daily tasks for new day
      userProgress.currentDayTasks = []
    }

    // Determine new capsule state
    if (affectedUsers.length > 0) {
      // If any users missed tasks, check if capsule should be locked
      const activeUsers = Array.from(capsule.userProgress.keys()).length
      const missedUsers = affectedUsers.length

      if (missedUsers === activeUsers) {
        // All users missed tasks - lock the capsule
        newState = CapsuleState.LOCKED
      } else {
        // Some users missed tasks - enter grace period for those users
        newState = CapsuleState.GRACE_PERIOD
      }
    } else {
      // No users missed tasks - keep unlocked
      newState = CapsuleState.UNLOCKED
    }

    // Apply state transition
    if (newState !== capsule.currentState) {
      this.stateMachine.transitionState(capsule, newState, StateTransitionTrigger.DAILY_RESET, "Daily reset performed")
    }

    return {
      capsuleId: capsule.id,
      affectedUsers,
      newState,
      resetReason: "Daily reset",
      timestamp: new Date(),
    }
  }

  private checkUserStreakStatus(userProgress: UserProgress, capsule: TimeLoopCapsule): StreakCheckResult {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Check if user completed tasks yesterday
    const completedYesterday =
      userProgress.lastCompletionDate && this.isSameDay(userProgress.lastCompletionDate, yesterday)

    const streakBroken = !completedYesterday && userProgress.currentStreak > 0

    if (streakBroken) {
      userProgress.currentStreak = 0
      userProgress.missedDays.push(yesterday)
    }

    const daysUntilPermanentUnlock = Math.max(
      0,
      capsule.loopConfig.streakRequiredForPermanentUnlock - userProgress.currentStreak,
    )

    return {
      userId: userProgress.userId,
      currentStreak: userProgress.currentStreak,
      streakBroken,
      eligibleForPermanentUnlock: userProgress.currentStreak >= capsule.loopConfig.streakRequiredForPermanentUnlock,
      daysUntilPermanentUnlock,
    }
  }

  private async handlePermanentUnlock(capsule: TimeLoopCapsule, userId: string): Promise<void> {
    if (capsule.permanentlyUnlocked) {
      return
    }

    capsule.permanentlyUnlocked = true
    capsule.permanentlyUnlockedAt = new Date()
    capsule.permanentlyUnlockedBy = [userId]

    this.stateMachine.transitionState(
      capsule,
      CapsuleState.PERMANENTLY_UNLOCKED,
      StateTransitionTrigger.PERMANENT_UNLOCK,
      `User ${userId} achieved required streak`,
      { userId },
    )

    this.logger.log(`Capsule ${capsule.id} permanently unlocked by user ${userId}`)
  }

  private checkDailyCompletion(
    capsule: TimeLoopCapsule,
    userProgress: UserProgress,
  ): { dayCompleted: boolean; remainingTasks: number } {
    const completedTasks = userProgress.currentDayTasks.filter((t) => t.isValid).length
    const requiredTasks = capsule.taskConfig.minimumTasksRequired
    const totalTasks = capsule.taskConfig.dailyTasks.length

    const dayCompleted = completedTasks >= requiredTasks
    const remainingTasks = Math.max(0, requiredTasks - completedTasks)

    return { dayCompleted, remainingTasks }
  }

  getCapsule(capsuleId: string): TimeLoopCapsule {
    const capsule = this.capsules.get(capsuleId)
    if (!capsule) {
      throw new NotFoundException(`Capsule with ID ${capsuleId} not found`)
    }
    return capsule
  }

  getUserProgress(capsuleId: string, userId: string): UserProgress | null {
    const capsule = this.getCapsule(capsuleId)
    return capsule.userProgress.get(userId) || null
  }

  updateCapsule(capsuleId: string, updateDto: UpdateTimeLoopCapsuleDto): TimeLoopCapsule {
    const capsule = this.getCapsule(capsuleId)

    if (updateDto.title !== undefined) capsule.title = updateDto.title
    if (updateDto.description !== undefined) capsule.description = updateDto.description
    if (updateDto.reward !== undefined) capsule.reward = updateDto.reward
    if (updateDto.expiresAt !== undefined) {
      capsule.expiresAt = updateDto.expiresAt ? new Date(updateDto.expiresAt) : undefined
    }
    if (updateDto.isActive !== undefined) capsule.isActive = updateDto.isActive
    if (updateDto.loopConfig !== undefined) capsule.loopConfig = updateDto.loopConfig
    if (updateDto.taskConfig !== undefined) capsule.taskConfig = updateDto.taskConfig

    this.logger.log(`Updated time loop capsule ${capsuleId}`)
    return capsule
  }

  deleteCapsule(capsuleId: string): void {
    const capsule = this.getCapsule(capsuleId)
    this.capsules.delete(capsuleId)
    this.logger.log(`Deleted time loop capsule ${capsuleId}`)
  }

  getAllCapsules(filters?: {
    createdBy?: string
    permanentlyUnlocked?: boolean
    isActive?: boolean
    state?: string
    limit?: number
    offset?: number
  }): TimeLoopCapsule[] {
    let capsules = Array.from(this.capsules.values())

    if (filters) {
      if (filters.createdBy) {
        capsules = capsules.filter((c) => c.createdBy === filters.createdBy)
      }
      if (filters.permanentlyUnlocked !== undefined) {
        capsules = capsules.filter((c) => c.permanentlyUnlocked === filters.permanentlyUnlocked)
      }
      if (filters.isActive !== undefined) {
        capsules = capsules.filter((c) => c.isActive === filters.isActive)
      }
      if (filters.state) {
        capsules = capsules.filter((c) => c.currentState === filters.state)
      }

      // Pagination
      const offset = filters.offset || 0
      const limit = filters.limit || 50
      capsules = capsules.slice(offset, offset + limit)
    }

    return capsules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getUserCapsules(userId: string): TimeLoopCapsule[] {
    return Array.from(this.capsules.values()).filter((c) => c.userProgress.has(userId))
  }

  getCapsuleStatistics(capsuleId: string): any {
    const capsule = this.getCapsule(capsuleId)

    const totalUsers = capsule.userProgress.size
    const activeUsers = Array.from(capsule.userProgress.values()).filter(
      (p) => p.lastCompletionDate && this.isWithinDays(p.lastCompletionDate, 7),
    ).length

    const streaks = Array.from(capsule.userProgress.values()).map((p) => p.currentStreak)
    const averageStreak = streaks.length > 0 ? streaks.reduce((sum, s) => sum + s, 0) / streaks.length : 0
    const longestStreak = Math.max(...streaks, 0)

    const completionRates = Array.from(capsule.userProgress.values()).map((p) => {
      const totalDays = p.streakHistory.length
      return totalDays > 0 ? (p.totalDaysCompleted / totalDays) * 100 : 0
    })
    const averageCompletionRate =
      completionRates.length > 0 ? completionRates.reduce((sum, r) => sum + r, 0) / completionRates.length : 0

    return {
      capsuleId,
      currentState: capsule.currentState,
      permanentlyUnlocked: capsule.permanentlyUnlocked,
      totalUsers,
      activeUsers,
      averageStreak: Math.round(averageStreak * 10) / 10,
      longestStreak,
      averageCompletionRate: Math.round(averageCompletionRate * 10) / 10,
      totalStateTransitions: capsule.stateHistory.length,
      createdAt: capsule.createdAt,
    }
  }

  private initializeUserProgress(userId: string): UserProgress {
    return {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      totalDaysCompleted: 0,
      currentDayTasks: [],
      streakHistory: [],
      missedDays: [],
      isEligibleForPermanentUnlock: false,
    }
  }

  private resetUserProgress(userProgress: UserProgress): void {
    userProgress.currentStreak = 0
    userProgress.currentDayTasks = []
    userProgress.missedDays = []
    userProgress.isEligibleForPermanentUnlock = false
  }

  private validateCapsuleConfig(createDto: CreateTimeLoopCapsuleDto): void {
    const { loopConfig, taskConfig } = createDto

    // Validate task configuration
    if (taskConfig.dailyTasks.length === 0) {
      throw new BadRequestException("At least one daily task must be configured")
    }

    if (taskConfig.minimumTasksRequired > taskConfig.dailyTasks.length) {
      throw new BadRequestException("Minimum tasks required cannot exceed total number of daily tasks")
    }

    const requiredTasks = taskConfig.dailyTasks.filter((t) => t.isRequired).length
    if (requiredTasks > taskConfig.minimumTasksRequired) {
      throw new BadRequestException("Number of required tasks cannot exceed minimum tasks required")
    }

    // Validate loop configuration
    if (loopConfig.streakRequiredForPermanentUnlock < 1) {
      throw new BadRequestException("Streak required for permanent unlock must be at least 1 day")
    }

    if (loopConfig.gracePeriodHours > 48) {
      throw new BadRequestException("Grace period cannot exceed 48 hours")
    }
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split("T")[0]
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  private isWithinDays(date: Date, days: number): boolean {
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= days
  }

  private generateCapsuleId(): string {
    return `timeloop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
