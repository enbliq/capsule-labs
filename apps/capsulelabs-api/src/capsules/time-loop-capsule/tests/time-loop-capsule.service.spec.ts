import { Test, type TestingModule } from "@nestjs/testing"
import { TimeLoopCapsuleService } from "../services/time-loop-capsule.service"
import { DailyTaskService } from "../services/daily-task.service"
import { StreakManagementService } from "../services/streak-management.service"
import { TaskValidationService } from "../services/task-validation.service"
import { CapsuleStateMachineService } from "../services/capsule-state-machine.service"
import { TaskType, TaskOrder, CapsuleState } from "../entities/time-loop-capsule.entity"
import type { CreateTimeLoopCapsuleDto, SubmitTaskDto } from "../dto/time-loop-capsule.dto"

describe("TimeLoopCapsuleService", () => {
  let service: TimeLoopCapsuleService
  let dailyTaskService: DailyTaskService
  let streakManagement: StreakManagementService
  let stateMachine: CapsuleStateMachineService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeLoopCapsuleService,
        DailyTaskService,
        StreakManagementService,
        TaskValidationService,
        CapsuleStateMachineService,
      ],
    }).compile()

    service = module.get<TimeLoopCapsuleService>(TimeLoopCapsuleService)
    dailyTaskService = module.get<DailyTaskService>(DailyTaskService)
    streakManagement = module.get<StreakManagementService>(StreakManagementService)
    stateMachine = module.get<CapsuleStateMachineService>(CapsuleStateMachineService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createTimeLoopCapsule", () => {
    it("should create a basic time loop capsule", async () => {
      const createDto: CreateTimeLoopCapsuleDto = {
        title: "Daily Wellness Challenge",
        description: "Complete daily wellness tasks to unlock rewards",
        reward: "Wellness Badge",
        createdBy: "admin123",
        loopConfig: {
          dailyResetTime: "00:00",
          timezone: "UTC",
          streakRequiredForPermanentUnlock: 7,
          gracePeriodHours: 6,
          allowMakeupTasks: true,
          maxMissedDaysBeforeReset: 3,
        },
        taskConfig: {
          dailyTasks: [
            {
              id: "steps",
              type: TaskType.STEPS,
              title: "Daily Steps",
              description: "Walk 10,000 steps",
              config: {
                targetSteps: 10000,
                allowManualEntry: false,
              },
              points: 50,
              isRequired: true,
              estimatedMinutes: 60,
            },
            {
              id: "gratitude",
              type: TaskType.GRATITUDE,
              title: "Gratitude Journal",
              description: "Write what you're grateful for",
              config: {
                minimumCharacters: 100,
                promptText: "What are you grateful for today?",
              },
              points: 30,
              isRequired: false,
              estimatedMinutes: 10,
            },
          ],
          taskOrder: TaskOrder.FLEXIBLE,
          allowPartialCompletion: true,
          minimumTasksRequired: 1,
        },
      }

      const capsule = await service.createTimeLoopCapsule(createDto)

      expect(capsule).toBeDefined()
      expect(capsule.title).toBe(createDto.title)
      expect(capsule.currentState).toBe(CapsuleState.LOCKED)
      expect(capsule.taskConfig.dailyTasks).toHaveLength(2)
      expect(capsule.loopConfig.streakRequiredForPermanentUnlock).toBe(7)
      expect(capsule.permanentlyUnlocked).toBe(false)
      expect(capsule.isActive).toBe(true)
    })

    it("should throw error for invalid task configuration", async () => {
      const createDto: CreateTimeLoopCapsuleDto = {
        title: "Invalid Capsule",
        description: "Invalid configuration",
        reward: "Nothing",
        createdBy: "admin123",
        loopConfig: {
          dailyResetTime: "00:00",
          timezone: "UTC",
          streakRequiredForPermanentUnlock: 7,
          gracePeriodHours: 6,
          allowMakeupTasks: true,
          maxMissedDaysBeforeReset: 3,
        },
        taskConfig: {
          dailyTasks: [], // No tasks
          taskOrder: TaskOrder.FLEXIBLE,
          allowPartialCompletion: true,
          minimumTasksRequired: 1,
        },
      }

      await expect(service.createTimeLoopCapsule(createDto)).rejects.toThrow(
        "At least one daily task must be configured",
      )
    })

    it("should throw error when minimum tasks exceeds total tasks", async () => {
      const createDto: CreateTimeLoopCapsuleDto = {
        title: "Invalid Capsule",
        description: "Invalid configuration",
        reward: "Nothing",
        createdBy: "admin123",
        loopConfig: {
          dailyResetTime: "00:00",
          timezone: "UTC",
          streakRequiredForPermanentUnlock: 7,
          gracePeriodHours: 6,
          allowMakeupTasks: true,
          maxMissedDaysBeforeReset: 3,
        },
        taskConfig: {
          dailyTasks: [
            {
              id: "task1",
              type: TaskType.STEPS,
              title: "Steps",
              description: "Walk",
              config: { targetSteps: 1000 },
              points: 10,
              isRequired: false,
              estimatedMinutes: 30,
            },
          ],
          taskOrder: TaskOrder.FLEXIBLE,
          allowPartialCompletion: true,
          minimumTasksRequired: 5, // More than available tasks
        },
      }

      await expect(service.createTimeLoopCapsule(createDto)).rejects.toThrow(
        "Minimum tasks required cannot exceed total number of daily tasks",
      )
    })
  })

  describe("submitTask", () => {
    let capsule: any
    let submitDto: SubmitTaskDto

    beforeEach(async () => {
      const createDto: CreateTimeLoopCapsuleDto = {
        title: "Test Capsule",
        description: "Test time loop capsule",
        reward: "Test Reward",
        createdBy: "admin123",
        loopConfig: {
          dailyResetTime: "00:00",
          timezone: "UTC",
          streakRequiredForPermanentUnlock: 3,
          gracePeriodHours: 6,
          allowMakeupTasks: true,
          maxMissedDaysBeforeReset: 2,
        },
        taskConfig: {
          dailyTasks: [
            {
              id: "steps",
              type: TaskType.STEPS,
              title: "Daily Steps",
              description: "Walk 5,000 steps",
              config: {
                targetSteps: 5000,
                allowManualEntry: true,
              },
              points: 50,
              isRequired: true,
              estimatedMinutes: 30,
            },
          ],
          taskOrder: TaskOrder.FLEXIBLE,
          allowPartialCompletion: false,
          minimumTasksRequired: 1,
        },
      }

      capsule = await service.createTimeLoopCapsule(createDto)

      // Transition to unlocked state for testing
      stateMachine.transitionState(capsule, CapsuleState.UNLOCKED, "manual_override" as any, "Test setup")

      submitDto = {
        capsuleId: capsule.id,
        taskId: "steps",
        userId: "user123",
        submissionData: {
          steps: 6000,
          source: "smartphone",
        },
      }
    })

    it("should successfully submit valid task", async () => {
      // Mock task validation to return success
      jest.spyOn(dailyTaskService, "validateTaskSubmission").mockResolvedValue({
        isValid: true,
        score: 50,
        feedback: "Great job! You walked 6000 steps.",
        metadata: {
          submittedSteps: 6000,
          targetSteps: 5000,
          completionRate: 120,
        },
      })

      // Mock streak update
      jest.spyOn(streakManagement, "updateStreak").mockReturnValue({
        eligibleForPermanentUnlock: false,
        streakIncreased: true,
      })

      const result = await service.submitTask(submitDto)

      expect(result.success).toBe(true)
      expect(result.message).toContain("Daily tasks completed")
      expect(result.progress).toBeDefined()
      expect(result.progress!.currentDayTasks).toHaveLength(1)
    })

    it("should reject invalid task submission", async () => {
      // Mock task validation to return failure
      jest.spyOn(dailyTaskService, "validateTaskSubmission").mockResolvedValue({
        isValid: false,
        score: 0,
        feedback: "Steps value is too low",
        errors: ["Minimum 5000 steps required"],
      })

      const result = await service.submitTask(submitDto)

      expect(result.success).toBe(false)
      expect(result.message).toContain("Task validation failed")
    })

    it("should prevent duplicate task submission", async () => {
      // Mock successful validation
      jest.spyOn(dailyTaskService, "validateTaskSubmission").mockResolvedValue({
        isValid: true,
        score: 50,
        feedback: "Task completed",
      })

      jest.spyOn(streakManagement, "updateStreak").mockReturnValue({
        eligibleForPermanentUnlock: false,
        streakIncreased: true,
      })

      // Submit task first time
      const result1 = await service.submitTask(submitDto)
      expect(result1.success).toBe(true)

      // Try to submit same task again
      const result2 = await service.submitTask(submitDto)
      expect(result2.success).toBe(false)
      expect(result2.message).toContain("already been completed today")
    })

    it("should handle permanent unlock when streak requirement met", async () => {
      // Mock successful validation
      jest.spyOn(dailyTaskService, "validateTaskSubmission").mockResolvedValue({
        isValid: true,
        score: 50,
        feedback: "Task completed",
      })

      // Mock streak update to trigger permanent unlock
      jest.spyOn(streakManagement, "updateStreak").mockReturnValue({
        eligibleForPermanentUnlock: true,
        streakIncreased: true,
      })

      const result = await service.submitTask(submitDto)

      expect(result.success).toBe(true)
      expect(capsule.permanentlyUnlocked).toBe(true)
      expect(capsule.currentState).toBe(CapsuleState.PERMANENTLY_UNLOCKED)
    })

    it("should reject task submission when capsule is locked", async () => {
      // Transition capsule to locked state
      stateMachine.transitionState(capsule, CapsuleState.LOCKED, "manual_override" as any, "Test lock")

      const result = await service.submitTask(submitDto)

      expect(result.success).toBe(false)
      expect(result.message).toContain("Cannot submit tasks when capsule is in locked state")
    })

    it("should reject task submission for permanently unlocked capsule", async () => {
      // Set capsule as permanently unlocked
      capsule.permanentlyUnlocked = true

      const result = await service.submitTask(submitDto)

      expect(result.success).toBe(false)
      expect(result.message).toContain("permanently unlocked and no longer requires daily tasks")
    })
  })

  describe("performDailyReset", () => {
    it("should perform daily reset for active capsules", async () => {
      // Create test capsule
      const createDto: CreateTimeLoopCapsuleDto = {
        title: "Reset Test Capsule",
        description: "Test daily reset",
        reward: "Reset Reward",
        createdBy: "admin123",
        loopConfig: {
          dailyResetTime: "00:00",
          timezone: "UTC",
          streakRequiredForPermanentUnlock: 7,
          gracePeriodHours: 6,
          allowMakeupTasks: true,
          maxMissedDaysBeforeReset: 3,
        },
        taskConfig: {
          dailyTasks: [
            {
              id: "task1",
              type: TaskType.GRATITUDE,
              title: "Gratitude",
              description: "Write gratitude",
              config: { minimumCharacters: 50 },
              points: 25,
              isRequired: true,
              estimatedMinutes: 5,
            },
          ],
          taskOrder: TaskOrder.FLEXIBLE,
          allowPartialCompletion: false,
          minimumTasksRequired: 1,
        },
      }

      const capsule = await service.createTimeLoopCapsule(createDto)

      // Add user progress
      const userProgress = {
        userId: "user123",
        currentStreak: 2,
        longestStreak: 2,
        totalDaysCompleted: 2,
        currentDayTasks: [],
        streakHistory: [],
        missedDays: [],
        isEligibleForPermanentUnlock: false,
      }

      capsule.userProgress.set("user123", userProgress)

      const results = await service.performDailyReset()

      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)

      // Check that user's daily tasks were reset
      const updatedProgress = capsule.userProgress.get("user123")
      expect(updatedProgress!.currentDayTasks).toHaveLength(0)
    })

    it("should skip permanently unlocked capsules during reset", async () => {
      const createDto: CreateTimeLoopCapsuleDto = {
        title: "Permanent Capsule",
        description: "Already unlocked",
        reward: "Permanent Reward",
        createdBy: "admin123",
        loopConfig: {
          dailyResetTime: "00:00",
          timezone: "UTC",
          streakRequiredForPermanentUnlock: 7,
          gracePeriodHours: 6,
          allowMakeupTasks: true,
          maxMissedDaysBeforeReset: 3,
        },
        taskConfig: {
          dailyTasks: [
            {
              id: "task1",
              type: TaskType.STEPS,
              title: "Steps",
              description: "Walk",
              config: { targetSteps: 1000 },
              points: 10,
              isRequired: true,
              estimatedMinutes: 30,
            },
          ],
          taskOrder: TaskOrder.FLEXIBLE,
          allowPartialCompletion: false,
          minimumTasksRequired: 1,
        },
      }

      const capsule = await service.createTimeLoopCapsule(createDto)
      capsule.permanentlyUnlocked = true

      const results = await service.performDailyReset()

      // Should not include permanently unlocked capsules in reset results
      const capsuleResult = results.find((r) => r.capsuleId === capsule.id)
      expect(capsuleResult).toBeUndefined()
    })
  })

  describe("getCapsuleStatistics", () => {
    it("should return correct capsule statistics", async () => {
      const createDto: CreateTimeLoopCapsuleDto = {
        title: "Stats Capsule",
        description: "Test statistics",
        reward: "Stats Reward",
        createdBy: "admin123",
        loopConfig: {
          dailyResetTime: "00:00",
          timezone: "UTC",
          streakRequiredForPermanentUnlock: 7,
          gracePeriodHours: 6,
          allowMakeupTasks: true,
          maxMissedDaysBeforeReset: 3,
        },
        taskConfig: {
          dailyTasks: [
            {
              id: "task1",
              type: TaskType.STEPS,
              title: "Steps",
              description: "Walk",
              config: { targetSteps: 1000 },
              points: 10,
              isRequired: true,
              estimatedMinutes: 30,
            },
          ],
          taskOrder: TaskOrder.FLEXIBLE,
          allowPartialCompletion: false,
          minimumTasksRequired: 1,
        },
      }

      const capsule = await service.createTimeLoopCapsule(createDto)

      // Add some user progress
      const userProgress1 = {
        userId: "user1",
        currentStreak: 5,
        longestStreak: 8,
        totalDaysCompleted: 10,
        lastCompletionDate: new Date(),
        currentDayTasks: [],
        streakHistory: [
          {
            date: new Date(),
            tasksCompleted: 1,
            totalTasks: 1,
            points: 10,
            completionRate: 100,
          },
        ],
        missedDays: [],
        isEligibleForPermanentUnlock: false,
      }

      const userProgress2 = {
        userId: "user2",
        currentStreak: 3,
        longestStreak: 3,
        totalDaysCompleted: 3,
        lastCompletionDate: new Date(),
        currentDayTasks: [],
        streakHistory: [],
        missedDays: [],
        isEligibleForPermanentUnlock: false,
      }

      capsule.userProgress.set("user1", userProgress1)
      capsule.userProgress.set("user2", userProgress2)

      const stats = service.getCapsuleStatistics(capsule.id)

      expect(stats.capsuleId).toBe(capsule.id)
      expect(stats.currentState).toBe(CapsuleState.LOCKED)
      expect(stats.totalUsers).toBe(2)
      expect(stats.activeUsers).toBe(2) // Both users completed recently
      expect(stats.averageStreak).toBe(4) // (5 + 3) / 2
      expect(stats.longestStreak).toBe(8)
      expect(stats.permanentlyUnlocked).toBe(false)
    })
  })
})
