import { Test, type TestingModule } from "@nestjs/testing"
import { DailyTaskService } from "../services/daily-task.service"
import { TaskValidationService } from "../services/task-validation.service"
import { TaskType } from "../entities/time-loop-capsule.entity"
import type { DailyTask, TaskSubmission } from "../entities/time-loop-capsule.entity"

describe("DailyTaskService", () => {
  let service: DailyTaskService
  let taskValidation: TaskValidationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyTaskService, TaskValidationService],
    }).compile()

    service = module.get<DailyTaskService>(DailyTaskService)
    taskValidation = module.get<TaskValidationService>(TaskValidationService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("validateTaskSubmission", () => {
    describe("Steps Task", () => {
      const stepsTask: DailyTask = {
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
      }

      it("should validate successful steps completion", async () => {
        const submission: TaskSubmission = {
          taskId: "steps",
          userId: "user123",
          submissionData: {
            steps: 12000,
            source: "fitness_tracker",
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(stepsTask, submission)

        expect(result.isValid).toBe(true)
        expect(result.score).toBe(50)
        expect(result.feedback).toContain("Great job")
        expect(result.metadata?.submittedSteps).toBe(12000)
        expect(result.metadata?.completionRate).toBe(120)
      })

      it("should reject insufficient steps", async () => {
        const submission: TaskSubmission = {
          taskId: "steps",
          userId: "user123",
          submissionData: {
            steps: 5000,
            source: "smartphone",
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(stepsTask, submission)

        expect(result.isValid).toBe(false)
        expect(result.score).toBe(25) // Partial credit
        expect(result.feedback).toContain("5000 steps")
        expect(result.feedback).toContain("Target: 10000")
      })

      it("should reject manual entry when not allowed", async () => {
        const submission: TaskSubmission = {
          taskId: "steps",
          userId: "user123",
          submissionData: {
            steps: 15000,
            source: "manual",
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(stepsTask, submission)

        expect(result.isValid).toBe(false)
        expect(result.score).toBe(0)
        expect(result.feedback).toContain("Manual step entry is not allowed")
      })

      it("should reject invalid steps data", async () => {
        const submission: TaskSubmission = {
          taskId: "steps",
          userId: "user123",
          submissionData: {
            steps: "invalid",
            source: "smartphone",
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(stepsTask, submission)

        expect(result.isValid).toBe(false)
        expect(result.score).toBe(0)
        expect(result.errors).toContain("Steps must be a positive number")
      })
    })

    describe("Quiz Task", () => {
      const quizTask: DailyTask = {
        id: "quiz",
        type: TaskType.QUIZ,
        title: "Daily Quiz",
        description: "Answer wellness questions",
        config: {
          questions: [
            {
              id: "q1",
              question: "How many hours of sleep are recommended?",
              options: ["6 hours", "7-9 hours", "10 hours", "5 hours"],
              correctAnswer: 1,
              explanation: "Adults need 7-9 hours of sleep per night",
            },
            {
              id: "q2",
              question: "What is the recommended daily water intake?",
              options: ["1 liter", "2 liters", "3 liters", "4 liters"],
              correctAnswer: 1,
            },
          ],
          passingScore: 70,
        },
        points: 40,
        isRequired: false,
        estimatedMinutes: 5,
      }

      it("should validate correct quiz answers", async () => {
        const submission: TaskSubmission = {
          taskId: "quiz",
          userId: "user123",
          submissionData: {
            answers: [1, 1], // Both correct
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(quizTask, submission)

        expect(result.isValid).toBe(true)
        expect(result.score).toBe(40)
        expect(result.feedback).toContain("100%")
        expect(result.metadata?.correctAnswers).toBe(2)
        expect(result.metadata?.scorePercentage).toBe(100)
      })

      it("should handle partial quiz success", async () => {
        const submission: TaskSubmission = {
          taskId: "quiz",
          userId: "user123",
          submissionData: {
            answers: [1, 0], // One correct, one wrong
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(quizTask, submission)

        expect(result.isValid).toBe(false) // 50% < 70% passing score
        expect(result.score).toBe(20) // 50% of 40 points
        expect(result.feedback).toContain("50%")
        expect(result.metadata?.correctAnswers).toBe(1)
      })

      it("should reject invalid quiz format", async () => {
        const submission: TaskSubmission = {
          taskId: "quiz",
          userId: "user123",
          submissionData: {
            answers: "invalid",
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(quizTask, submission)

        expect(result.isValid).toBe(false)
        expect(result.score).toBe(0)
        expect(result.errors).toContain("Answers must be provided as an array")
      })

      it("should reject wrong number of answers", async () => {
        const submission: TaskSubmission = {
          taskId: "quiz",
          userId: "user123",
          submissionData: {
            answers: [1], // Only one answer for two questions
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(quizTask, submission)

        expect(result.isValid).toBe(false)
        expect(result.score).toBe(0)
        expect(result.errors).toContain("Number of answers doesn't match number of questions")
      })
    })

    describe("Gratitude Task", () => {
      const gratitudeTask: DailyTask = {
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
      }

      it("should validate good gratitude entry", async () => {
        const submission: TaskSubmission = {
          taskId: "gratitude",
          userId: "user123",
          submissionData: {
            text: "I am grateful for my family, friends, and the beautiful weather today. It's amazing how small things can bring so much joy and happiness to our lives.",
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(gratitudeTask, submission)

        expect(result.isValid).toBe(true)
        expect(result.score).toBe(30)
        expect(result.feedback).toContain("Thank you for sharing")
        expect(result.metadata?.textLength).toBeGreaterThan(100)
      })

      it("should reject short gratitude text", async () => {
        const submission: TaskSubmission = {
          taskId: "gratitude",
          userId: "user123",
          submissionData: {
            text: "Thanks",
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(gratitudeTask, submission)

        expect(result.isValid).toBe(false)
        expect(result.score).toBe(0)
        expect(result.feedback).toContain("too short")
        expect(result.errors).toContain("at least 100 characters long")
      })

      it("should penalize repetitive text", async () => {
        const submission: TaskSubmission = {
          taskId: "gratitude",
          userId: "user123",
          submissionData: {
            text: "I am grateful grateful grateful grateful grateful grateful grateful grateful grateful grateful grateful grateful grateful grateful grateful grateful grateful grateful grateful grateful",
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(gratitudeTask, submission)

        expect(result.isValid).toBe(true)
        expect(result.score).toBeLessThan(30) // Penalty applied
        expect(result.metadata?.qualityScore).toBeLessThan(100)
      })

      it("should reject non-string input", async () => {
        const submission: TaskSubmission = {
          taskId: "gratitude",
          userId: "user123",
          submissionData: {
            text: 123,
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(gratitudeTask, submission)

        expect(result.isValid).toBe(false)
        expect(result.score).toBe(0)
        expect(result.errors).toContain("Gratitude text must be a string")
      })
    })

    describe("Meditation Task", () => {
      const meditationTask: DailyTask = {
        id: "meditation",
        type: TaskType.MEDITATION,
        title: "Daily Meditation",
        description: "Meditate for at least 10 minutes",
        config: {
          minimumDuration: 600, // 10 minutes
          guidedSession: true,
        },
        points: 35,
        isRequired: false,
        estimatedMinutes: 10,
      }

      it("should validate successful meditation session", async () => {
        const submission: TaskSubmission = {
          taskId: "meditation",
          userId: "user123",
          submissionData: {
            duration: 900, // 15 minutes
            sessionType: "guided",
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(meditationTask, submission)

        expect(result.isValid).toBe(true)
        expect(result.score).toBe(42) // 35 * 1.2 bonus for guided session
        expect(result.feedback).toContain("15 minutes")
        expect(result.metadata?.bonusMultiplier).toBe(1.2)
      })

      it("should reject insufficient meditation duration", async () => {
        const submission: TaskSubmission = {
          taskId: "meditation",
          userId: "user123",
          submissionData: {
            duration: 300, // 5 minutes
            sessionType: "self-guided",
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(meditationTask, submission)

        expect(result.isValid).toBe(false)
        expect(result.score).toBe(18) // Partial credit: (300/600) * 35
        expect(result.feedback).toContain("5 minutes")
        expect(result.feedback).toContain("Minimum: 10 minutes")
      })

      it("should reject invalid duration data", async () => {
        const submission: TaskSubmission = {
          taskId: "meditation",
          userId: "user123",
          submissionData: {
            duration: "invalid",
            sessionType: "guided",
          },
          submittedAt: new Date(),
        }

        const result = await service.validateTaskSubmission(meditationTask, submission)

        expect(result.isValid).toBe(false)
        expect(result.score).toBe(0)
        expect(result.errors).toContain("Duration must be a positive number in seconds")
      })
    })
  })

  describe("getTodaysTasks", () => {
    const tasks: DailyTask[] = [
      {
        id: "task1",
        type: TaskType.STEPS,
        title: "Steps",
        description: "Walk",
        config: {},
        points: 10,
        isRequired: true,
        estimatedMinutes: 30,
      },
      {
        id: "task2",
        type: TaskType.GRATITUDE,
        title: "Gratitude",
        description: "Write",
        config: {},
        points: 20,
        isRequired: false,
        estimatedMinutes: 10,
      },
      {
        id: "task3",
        type: TaskType.MEDITATION,
        title: "Meditation",
        description: "Meditate",
        config: {},
        points: 30,
        isRequired: false,
        estimatedMinutes: 15,
      },
    ]

    it("should return tasks in original order for sequential", () => {
      const result = service.getTodaysTasks(tasks, "sequential")

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe("task1")
      expect(result[1].id).toBe("task2")
      expect(result[2].id).toBe("task3")
    })

    it("should return tasks in original order for flexible", () => {
      const result = service.getTodaysTasks(tasks, "flexible")

      expect(result).toHaveLength(3)
      expect(result).toEqual(tasks)
    })

    it("should shuffle tasks for random order", () => {
      // Mock Math.random to control shuffling
      const originalRandom = Math.random
      let callCount = 0
      Math.random = jest.fn(() => {
        callCount++
        return callCount === 1 ? 0.8 : 0.2 // Specific values to ensure shuffling
      })

      const result = service.getTodaysTasks(tasks, "random")

      expect(result).toHaveLength(3)
      // Order should be different due to shuffling
      expect(result.map((t) => t.id)).not.toEqual(["task1", "task2", "task3"])

      // Restore original Math.random
      Math.random = originalRandom
    })
  })
})
