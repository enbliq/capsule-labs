import { Test, type TestingModule } from "@nestjs/testing"
import { ConfigService } from "@nestjs/config"
import { MeditationChallengeService } from "../meditation-challenge.service"
import { jest } from "@jest/globals"

describe("MeditationChallengeService", () => {
  let service: MeditationChallengeService
  let configService: ConfigService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeditationChallengeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              const config = {
                MEDITATION_DURATION: 10000, // 10 seconds for testing
                MEDITATION_ALLOW_PAUSES: true,
                MEDITATION_MAX_PAUSES: 3,
                MEDITATION_PAUSE_GRACE_PERIOD: 5000,
                MEDITATION_MOVEMENT_SENSITIVITY: "medium",
                MEDITATION_NOISE_SENSITIVITY: "medium",
                MEDITATION_ALLOW_SCREEN_EXIT: false,
                MEDITATION_AUTO_FAIL_ON_INTERRUPTION: false,
                MEDITATION_SESSION_EXPIRY: 60000,
              }
              return config[key] || defaultValue
            }),
          },
        },
      ],
    }).compile()

    service = module.get<MeditationChallengeService>(MeditationChallengeService)
    configService = module.get<ConfigService>(ConfigService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createSession", () => {
    it("should create a new meditation session", () => {
      const userId = "test-user"
      const result = service.createSession(userId)

      expect(result).toHaveProperty("sessionId")
      expect(result).toHaveProperty("settings")
      expect(typeof result.sessionId).toBe("string")

      const session = service.getSessionStatus(result.sessionId)
      expect(session).toBeDefined()
      expect(session?.userId).toBe(userId)
      expect(session?.status).toBe("preparing")
    })

    it("should create a session with custom settings", () => {
      const userId = "test-user"
      const customSettings = {
        duration: 60000,
        allowPauses: false,
        movementSensitivity: "high" as const,
      }

      const result = service.createSession(userId, customSettings)
      const session = service.getSessionStatus(result.sessionId)

      expect(session?.settings.duration).toBe(60000)
      expect(session?.settings.allowPauses).toBe(false)
      expect(session?.settings.movementSensitivity).toBe("high")
    })
  })

  describe("startSession", () => {
    it("should start a meditation session", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId)

      const result = service.startSession(sessionId)
      expect(result.success).toBe(true)
      expect(result.startTime).toBeDefined()

      const session = service.getSessionStatus(sessionId)
      expect(session?.status).toBe("active")
      expect(session?.startTime).toBeGreaterThan(0)
    })

    it("should not start a non-existent session", () => {
      const result = service.startSession("non-existent")
      expect(result.success).toBe(false)
      expect(result.message).toBe("Session not found")
    })
  })

  describe("pauseSession", () => {
    it("should pause an active session", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId)
      service.startSession(sessionId)

      const result = service.pauseSession(sessionId, "test pause")
      expect(result.success).toBe(true)

      const session = service.getSessionStatus(sessionId)
      expect(session?.status).toBe("paused")
      expect(session?.interruptions).toHaveLength(1)
      expect(session?.interruptions[0].type).toBe("manual_pause")
    })

    it("should fail to pause when pauses are not allowed", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId, { allowPauses: false })
      service.startSession(sessionId)

      const result = service.pauseSession(sessionId)
      expect(result.success).toBe(false)
      expect(result.message).toContain("Pauses are not allowed")
    })
  })

  describe("resumeSession", () => {
    it("should resume a paused session", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId)
      service.startSession(sessionId)
      service.pauseSession(sessionId)

      const result = service.resumeSession(sessionId)
      expect(result.success).toBe(true)

      const session = service.getSessionStatus(sessionId)
      expect(session?.status).toBe("active")
    })
  })

  describe("recordInterruption", () => {
    it("should record a movement interruption", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId)
      service.startSession(sessionId)

      const result = service.recordInterruption(sessionId, "movement", "low", "slight hand movement")
      expect(result.success).toBe(true)

      const session = service.getSessionStatus(sessionId)
      expect(session?.interruptions).toHaveLength(1)
      expect(session?.interruptions[0].type).toBe("movement")
      expect(session?.interruptions[0].severity).toBe("low")
    })

    it("should fail session on high severity interruption", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId)
      service.startSession(sessionId)

      const result = service.recordInterruption(sessionId, "movement", "high", "major movement")
      expect(result.success).toBe(false)
      expect(result.sessionEnded).toBe(true)

      const session = service.getSessionStatus(sessionId)
      expect(session).toBeNull() // Session should be removed after failure
    })

    it("should fail session on screen exit when not allowed", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId, { allowScreenExit: false })
      service.startSession(sessionId)

      const result = service.recordInterruption(sessionId, "screen_exit", "medium", "user left screen")
      expect(result.success).toBe(false)
      expect(result.sessionEnded).toBe(true)
    })
  })

  describe("endSession", () => {
    it("should end a session manually", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId)
      service.startSession(sessionId)

      const result = service.endSession(sessionId)
      expect(result.sessionId).toBe(sessionId)
      expect(result.success).toBe(false) // Not completed full duration
      expect(result.unlocked).toBe(false)
    })
  })

  describe("getUserStatistics", () => {
    it("should return user statistics", () => {
      const userId = "test-user"

      // Create and complete a session
      const { sessionId } = service.createSession(userId, { duration: 1000 }) // 1 second
      service.startSession(sessionId)

      // Wait for completion
      setTimeout(() => {
        const stats = service.getUserStatistics(userId)
        expect(stats.totalSessions).toBeGreaterThan(0)
      }, 1100)
    })
  })
})
