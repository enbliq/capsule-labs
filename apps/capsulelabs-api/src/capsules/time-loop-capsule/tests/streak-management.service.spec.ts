import { Test, type TestingModule } from "@nestjs/testing"
import { StreakManagementService } from "../services/streak-management.service"
import type { UserProgress, LoopConfig } from "../entities/time-loop-capsule.entity"

describe("StreakManagementService", () => {
  let service: StreakManagementService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreakManagementService],
    }).compile()

    service = module.get<StreakManagementService>(StreakManagementService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("updateStreak", () => {
    const mockLoopConfig: LoopConfig = {
      dailyResetTime: "00:00",
      timezone: "UTC",
      streakRequiredForPermanentUnlock: 7,
      gracePeriodHours: 6,
      allowMakeupTasks: true,
      maxMissedDaysBeforeReset: 3,
    }

    it("should start new streak for first completion", () => {
      const userProgress: UserProgress = {
        userId: "user123",
        currentStreak: 0,
        longestStreak: 0,
        totalDaysCompleted: 0,
        currentDayTasks: [
          {
            taskId: "task1",
            completedAt: new Date(),
            submissionData: {},
            points: 50,
            isValid: true,
          },
        ],
        streakHistory: [],
        missedDays: [],
        isEligibleForPermanentUnlock: false,
      }

      const result = service.updateStreak(userProgress, mockLoopConfig)

      expect(result.streakIncreased).toBe(true)
      expect(result.eligibleForPermanentUnlock).toBe(false)
      expect(userProgress.currentStreak).toBe(1)
      expect(userProgress.longestStreak).toBe(1)
      expect(userProgress.totalDaysCompleted).toBe(1)
      expect(userProgress.lastCompletionDate).toBeDefined()
      expect(userProgress.streakHistory).toHaveLength(1)
    })

    it("should continue streak when completed yesterday", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const userProgress: UserProgress = {
        userId: "user123",
        currentStreak: 3,
        longestStreak: 5,
        totalDaysCompleted: 3,
        lastCompletionDate: yesterday,
        currentDayTasks: [
          {
            taskId: "task1",
            completedAt: new Date(),
            submissionData: {},
            points: 50,
            isValid: true,
          },
        ],
        streakHistory: [],
        missedDays: [],
        isEligibleForPermanentUnlock: false,
      }

      const result = service.updateStreak(userProgress, mockLoopConfig)

      expect(result.streakIncreased).toBe(true)
      expect(userProgress.currentStreak).toBe(4)
      expect(userProgress.longestStreak).toBe(5) // Unchanged
      expect(userProgress.totalDaysCompleted).toBe(4)
    })

    it("should reset streak when gap in completion", () => {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      const userProgress: UserProgress = {
        userId: "user123",
        currentStreak: 5,
        longestStreak: 8,
        totalDaysCompleted: 5,
        lastCompletionDate: threeDaysAgo,
        currentDayTasks: [
          {
            taskId: "task1",
            completedAt: new Date(),
            submissionData: {},
            points: 50,
            isValid: true,
          },
        ],
        streakHistory: [],
        missedDays: [],
        isEligibleForPermanentUnlock: false,
      }

      const result = service.updateStreak(userProgress, mockLoopConfig)

      expect(result.streakIncreased).toBe(true)
      expect(userProgress.currentStreak).toBe(1) // Reset to 1
      expect(userProgress.longestStreak).toBe(8) // Unchanged
      expect(userProgress.totalDaysCompleted).toBe(6)
    })

    it("should detect eligibility for permanent unlock", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const userProgress: UserProgress = {
        userId: "user123",
        currentStreak: 6, // One day short of requirement
        longestStreak: 6,
        totalDaysCompleted: 6,
        lastCompletionDate: yesterday,
        currentDayTasks: [
          {
            taskId: "task1",
            completedAt: new Date(),
            submissionData: {},
            points: 50,
            isValid: true,
          },
        ],
        streakHistory: [],
        missedDays: [],
        isEligibleForPermanentUnlock: false,
      }

      const result = service.updateStreak(userProgress, mockLoopConfig)

      expect(result.eligibleForPermanentUnlock).toBe(true)
      expect(userProgress.currentStreak).toBe(7) // Meets requirement
      expect(userProgress.isEligibleForPermanentUnlock).toBe(true)
    })

    it("should not update streak if already completed today", () => {
      const today = new Date()

      const userProgress: UserProgress = {
        userId: "user123",
        currentStreak: 3,
        longestStreak: 5,
        totalDaysCompleted: 3,
        lastCompletionDate: today,
        currentDayTasks: [],
        streakHistory: [],
        missedDays: [],
        isEligibleForPermanentUnlock: false,
      }

      const result = service.updateStreak(userProgress, mockLoopConfig)

      expect(result.streakIncreased).toBe(false)
      expect(userProgress.currentStreak).toBe(3) // Unchanged
      expect(userProgress.totalDaysCompleted).toBe(3) // Unchanged
    })

    it("should update longest streak when current exceeds it", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const userProgress: UserProgress = {
        userId: "user123",
        currentStreak: 9,
        longestStreak: 8,
        totalDaysCompleted: 9,
        lastCompletionDate: yesterday,
        currentDayTasks: [
          {
            taskId: "task1",
            completedAt: new Date(),
            submissionData: {},
            points: 50,
            isValid: true,
          },
        ],
        streakHistory: [],
        missedDays: [],
        isEligibleForPermanentUnlock: false,
      }

      const result = service.updateStreak(userProgress, mockLoopConfig)

      expect(userProgress.currentStreak).toBe(10)
      expect(userProgress.longestStr\
