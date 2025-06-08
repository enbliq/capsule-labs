import { Test, type TestingModule } from "@nestjs/testing"
import { ConfigService } from "@nestjs/config"
import { TypingTestChallengeService } from "../typing-test-challenge.service"
import { NotFoundException, BadRequestException } from "@nestjs/common"

describe("TypingTestChallengeService", () => {
  let service: TypingTestChallengeService
  let configService: ConfigService

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        TYPING_TEST_DURATION: 30000,
        TYPING_TEST_MIN_WPM: 40,
        TYPING_TEST_MIN_ACCURACY: 90,
        TYPING_TEST_SESSION_EXPIRY: 300000,
      }
      return config[key] || defaultValue
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypingTestChallengeService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<TypingTestChallengeService>(TypingTestChallengeService)
    configService = module.get<ConfigService>(ConfigService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("createTypingTest", () => {
    it("should create a typing test session with default settings", async () => {
      const createDto = {
        userId: "user123",
      }

      const result = await service.createTypingTest(createDto)

      expect(result).toMatchObject({
        sessionId: expect.any(String),
        text: expect.any(String),
        duration: 30000,
        minWpm: 40,
        minAccuracy: 90,
        difficulty: "medium",
        status: "created",
        expiresAt: expect.any(Date),
      })
      expect(result.text.length).toBeGreaterThan(0)
    })

    it("should create a typing test session with custom settings", async () => {
      const createDto = {
        userId: "user123",
        duration: 60000,
        minWpm: 50,
        minAccuracy: 95,
        difficulty: "hard" as const,
        includeNumbers: true,
        includePunctuation: false,
        includeCapitals: false,
      }

      const result = await service.createTypingTest(createDto)

      expect(result).toMatchObject({
        sessionId: expect.any(String),
        text: expect.any(String),
        duration: 60000,
        minWpm: 50,
        minAccuracy: 95,
        difficulty: "hard",
        status: "created",
      })
    })

    it("should modify text based on settings", async () => {
      const createDto = {
        userId: "user123",
        includeCapitals: false,
        includePunctuation: false,
      }

      const result = await service.createTypingTest(createDto)

      expect(result.text).toMatch(/^[a-z0-9\s]+$/)
    })
  })

  describe("startTypingTest", () => {
    it("should start a typing test session", async () => {
      const createDto = { userId: "user123" }
      const session = await service.createTypingTest(createDto)

      const startDto = { userId: "user123" }
      const result = await service.startTypingTest(session.sessionId, startDto)

      expect(result).toMatchObject({
        success: true,
        startTime: expect.any(Date),
      })

      const status = await service.getSessionStatus(session.sessionId)
      expect(status.status).toBe("started")
      expect(status.startTime).toBeDefined()
    })

    it("should throw NotFoundException for non-existent session", async () => {
      const startDto = { userId: "user123" }

      await expect(service.startTypingTest("non-existent", startDto)).rejects.toThrow(NotFoundException)
    })

    it("should throw BadRequestException for wrong user", async () => {
      const createDto = { userId: "user123" }
      const session = await service.createTypingTest(createDto)

      const startDto = { userId: "user456" }

      await expect(service.startTypingTest(session.sessionId, startDto)).rejects.toThrow(BadRequestException)
    })

    it("should throw BadRequestException for already started session", async () => {
      const createDto = { userId: "user123" }
      const session = await service.createTypingTest(createDto)

      const startDto = { userId: "user123" }
      await service.startTypingTest(session.sessionId, startDto)

      await expect(service.startTypingTest(session.sessionId, startDto)).rejects.toThrow(BadRequestException)
    })
  })

  describe("submitTypingTest", () => {
    it("should submit successful typing test", async () => {
      const createDto = {
        userId: "user123",
        minWpm: 20,
        minAccuracy: 80,
      }
      const session = await service.createTypingTest(createDto)

      const startDto = { userId: "user123" }
      await service.startTypingTest(session.sessionId, startDto)

      // Wait a bit to simulate typing time
      await new Promise((resolve) => setTimeout(resolve, 100))

      const submitDto = {
        userId: "user123",
        userInput: session.text, // Perfect typing
      }

      const result = await service.submitTypingTest(session.sessionId, submitDto)

      expect(result).toMatchObject({
        sessionId: session.sessionId,
        success: true,
        wpm: expect.any(Number),
        accuracy: expect.any(Number),
        errors: 0,
        correctChars: session.text.length,
        totalChars: session.text.length,
        timeElapsed: expect.any(Number),
        requiredWpm: 20,
        requiredAccuracy: 80,
        completedAt: expect.any(Date),
      })

      expect(result.wpm).toBeGreaterThan(0)
      expect(result.accuracy).toBe(100)
    })

    it("should submit failed typing test due to low accuracy", async () => {
      const createDto = {
        userId: "user123",
        minWpm: 20,
        minAccuracy: 90,
      }
      const session = await service.createTypingTest(createDto)

      const startDto = { userId: "user123" }
      await service.startTypingTest(session.sessionId, startDto)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const submitDto = {
        userId: "user123",
        userInput: "wrong text completely different",
      }

      const result = await service.submitTypingTest(session.sessionId, submitDto)

      expect(result.success).toBe(false)
      expect(result.accuracy).toBeLessThan(90)
    })

    it("should throw NotFoundException for non-existent session", async () => {
      const submitDto = {
        userId: "user123",
        userInput: "some text",
      }

      await expect(service.submitTypingTest("non-existent", submitDto)).rejects.toThrow(NotFoundException)
    })

    it("should throw BadRequestException for wrong user", async () => {
      const createDto = { userId: "user123" }
      const session = await service.createTypingTest(createDto)

      const startDto = { userId: "user123" }
      await service.startTypingTest(session.sessionId, startDto)

      const submitDto = {
        userId: "user456",
        userInput: "some text",
      }

      await expect(service.submitTypingTest(session.sessionId, submitDto)).rejects.toThrow(BadRequestException)
    })

    it("should throw BadRequestException for not started session", async () => {
      const createDto = { userId: "user123" }
      const session = await service.createTypingTest(createDto)

      const submitDto = {
        userId: "user123",
        userInput: "some text",
      }

      await expect(service.submitTypingTest(session.sessionId, submitDto)).rejects.toThrow(BadRequestException)
    })
  })

  describe("getSessionStatus", () => {
    it("should return session status", async () => {
      const createDto = { userId: "user123" }
      const session = await service.createTypingTest(createDto)

      const status = await service.getSessionStatus(session.sessionId)

      expect(status).toMatchObject({
        sessionId: session.sessionId,
        text: session.text,
        duration: 30000,
        minWpm: 40,
        minAccuracy: 90,
        difficulty: "medium",
        status: "created",
        expiresAt: expect.any(Date),
      })
    })

    it("should throw NotFoundException for non-existent session", async () => {
      await expect(service.getSessionStatus("non-existent")).rejects.toThrow(NotFoundException)
    })
  })

  describe("getUserSessions", () => {
    it("should return empty array for user with no sessions", async () => {
      const sessions = await service.getUserSessions("user123")
      expect(sessions).toEqual([])
    })

    it("should return user sessions after completion", async () => {
      const createDto = {
        userId: "user123",
        minWpm: 20,
        minAccuracy: 80,
      }
      const session = await service.createTypingTest(createDto)

      await service.startTypingTest(session.sessionId, { userId: "user123" })
      await new Promise((resolve) => setTimeout(resolve, 100))
      await service.submitTypingTest(session.sessionId, {
        userId: "user123",
        userInput: session.text,
      })

      const sessions = await service.getUserSessions("user123")
      expect(sessions).toHaveLength(1)
      expect(sessions[0]).toMatchObject({
        sessionId: session.sessionId,
        userId: "user123",
        success: true,
      })
    })
  })

  describe("getUserStatistics", () => {
    it("should return empty statistics for user with no sessions", async () => {
      const stats = await service.getUserStatistics("user123")

      expect(stats).toMatchObject({
        totalSessions: 0,
        completedSessions: 0,
        failedSessions: 0,
        successRate: 0,
        averageWpm: 0,
        bestWpm: 0,
        averageAccuracy: 0,
        bestAccuracy: 0,
        totalTypingTime: 0,
        currentStreak: 0,
        bestStreak: 0,
      })
    })

    it("should calculate statistics correctly", async () => {
      const userId = "user123"

      // Create and complete multiple sessions
      for (let i = 0; i < 3; i++) {
        const createDto = {
          userId,
          minWpm: 20,
          minAccuracy: 80,
        }
        const session = await service.createTypingTest(createDto)

        await service.startTypingTest(session.sessionId, { userId })
        await new Promise((resolve) => setTimeout(resolve, 100))
        await service.submitTypingTest(session.sessionId, {
          userId,
          userInput: session.text,
        })
      }

      const stats = await service.getUserStatistics(userId)

      expect(stats.totalSessions).toBe(3)
      expect(stats.completedSessions).toBe(3)
      expect(stats.failedSessions).toBe(0)
      expect(stats.successRate).toBe(100)
      expect(stats.averageWpm).toBeGreaterThan(0)
      expect(stats.bestWpm).toBeGreaterThan(0)
      expect(stats.currentStreak).toBe(3)
      expect(stats.bestStreak).toBe(3)
    })
  })
})
