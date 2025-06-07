import { Test, type TestingModule } from "@nestjs/testing"
import { ConfigService } from "@nestjs/config"
import {
  WhisperPasswordChallengeService,
  type AudioAnalysis,
  type SpeechRecognitionResult,
} from "../whisper-password-challenge.service"

describe("WhisperPasswordChallengeService", () => {
  let service: WhisperPasswordChallengeService
  let configService: ConfigService

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => {
      const config = {
        WHISPER_MAX_DECIBEL: -20,
        WHISPER_MIN_DECIBEL: -60,
        WHISPER_MIN_CONFIDENCE: 0.7,
        WHISPER_MAX_ATTEMPTS: 5,
        WHISPER_SESSION_EXPIRY: 300000,
        WHISPER_MAX_DURATION: 10000,
        WHISPER_MIN_DURATION: 1000,
      }
      return config[key] || defaultValue
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhisperPasswordChallengeService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<WhisperPasswordChallengeService>(WhisperPasswordChallengeService)
    configService = module.get<ConfigService>(ConfigService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createSession", () => {
    it("should create a whisper session successfully", async () => {
      const session = await service.createSession("user-123", "secret phrase")

      expect(session).toBeDefined()
      expect(session.userId).toBe("user-123")
      expect(session.password).toBe("secret phrase")
      expect(session.status).toBe("active")
      expect(session.maxAttempts).toBe(5)
      expect(session.remainingAttempts).toBe(5)
      expect(session.unlocked).toBe(false)
    })

    it("should throw error for empty password", async () => {
      await expect(service.createSession("user-123", "")).rejects.toThrow("Password cannot be empty")
    })

    it("should throw error for too long password", async () => {
      const longPassword = "a".repeat(101)
      await expect(service.createSession("user-123", longPassword)).rejects.toThrow("Password too long")
    })

    it("should create session with custom settings", async () => {
      const session = await service.createSession("user-123", "test", {
        maxAttempts: 3,
        maxDecibelLevel: -15,
        minConfidence: 0.8,
        caseSensitive: true,
      })

      expect(session.maxAttempts).toBe(3)
      expect(session.settings.maxDecibelLevel).toBe(-15)
      expect(session.settings.minConfidence).toBe(0.8)
      expect(session.settings.caseSensitive).toBe(true)
    })
  })

  describe("processWhisperAttempt", () => {
    let sessionId: string

    beforeEach(async () => {
      const session = await service.createSession("user-123", "hello world")
      sessionId = session.sessionId
    })

    it("should process successful whisper attempt", async () => {
      const audioAnalysis: AudioAnalysis = {
        averageDecibel: -25,
        peakDecibel: -20,
        duration: 2000,
        frequency: 440,
        isWhisperLevel: true,
        noiseFloor: -45,
        speechDetected: true,
      }

      const speechResult: SpeechRecognitionResult = {
        transcript: "hello world",
        confidence: 0.9,
        language: "en-US",
        isFinal: true,
      }

      const result = await service.processWhisperAttempt(sessionId, audioAnalysis, speechResult)

      expect(result.success).toBe(true)
      expect(result.unlocked).toBe(true)
      expect(result.attempt.passwordMatch).toBe(true)
      expect(result.attempt.volumeValid).toBe(true)
      expect(result.session.status).toBe("completed")
    })

    it("should fail for volume too loud", async () => {
      const audioAnalysis: AudioAnalysis = {
        averageDecibel: -10, // Too loud
        peakDecibel: -5,
        duration: 2000,
        frequency: 440,
        isWhisperLevel: false,
        noiseFloor: -45,
        speechDetected: true,
      }

      const speechResult: SpeechRecognitionResult = {
        transcript: "hello world",
        confidence: 0.9,
        language: "en-US",
        isFinal: true,
      }

      const result = await service.processWhisperAttempt(sessionId, audioAnalysis, speechResult)

      expect(result.success).toBe(false)
      expect(result.unlocked).toBe(false)
      expect(result.attempt.volumeValid).toBe(false)
      expect(result.attempt.failureReason).toContain("Volume too loud")
    })

    it("should fail for incorrect password", async () => {
      const audioAnalysis: AudioAnalysis = {
        averageDecibel: -25,
        peakDecibel: -20,
        duration: 2000,
        frequency: 440,
        isWhisperLevel: true,
        noiseFloor: -45,
        speechDetected: true,
      }

      const speechResult: SpeechRecognitionResult = {
        transcript: "wrong password",
        confidence: 0.9,
        language: "en-US",
        isFinal: true,
      }

      const result = await service.processWhisperAttempt(sessionId, audioAnalysis, speechResult)

      expect(result.success).toBe(false)
      expect(result.unlocked).toBe(false)
      expect(result.attempt.passwordMatch).toBe(false)
      expect(result.attempt.failureReason).toContain("Password incorrect")
    })

    it("should fail for low confidence", async () => {
      const audioAnalysis: AudioAnalysis = {
        averageDecibel: -25,
        peakDecibel: -20,
        duration: 2000,
        frequency: 440,
        isWhisperLevel: true,
        noiseFloor: -45,
        speechDetected: true,
      }

      const speechResult: SpeechRecognitionResult = {
        transcript: "hello world",
        confidence: 0.5, // Too low
        language: "en-US",
        isFinal: true,
      }

      const result = await service.processWhisperAttempt(sessionId, audioAnalysis, speechResult)

      expect(result.success).toBe(false)
      expect(result.unlocked).toBe(false)
      expect(result.attempt.failureReason).toContain("Speech confidence too low")
    })

    it("should handle session expiry", async () => {
      // Create session with short expiry
      const session = await service.createSession("user-123", "test", { sessionExpiry: 1 })

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 10))

      const audioAnalysis: AudioAnalysis = {
        averageDecibel: -25,
        peakDecibel: -20,
        duration: 2000,
        frequency: 440,
        isWhisperLevel: true,
        noiseFloor: -45,
        speechDetected: true,
      }

      const speechResult: SpeechRecognitionResult = {
        transcript: "test",
        confidence: 0.9,
        language: "en-US",
        isFinal: true,
      }

      await expect(service.processWhisperAttempt(session.sessionId, audioAnalysis, speechResult)).rejects.toThrow(
        "Session has expired",
      )
    })

    it("should handle maximum attempts exceeded", async () => {
      const session = await service.createSession("user-123", "test", { maxAttempts: 1 })

      const audioAnalysis: AudioAnalysis = {
        averageDecibel: -25,
        peakDecibel: -20,
        duration: 2000,
        frequency: 440,
        isWhisperLevel: true,
        noiseFloor: -45,
        speechDetected: true,
      }

      const speechResult: SpeechRecognitionResult = {
        transcript: "wrong",
        confidence: 0.9,
        language: "en-US",
        isFinal: true,
      }

      // First attempt should work but fail
      const result1 = await service.processWhisperAttempt(session.sessionId, audioAnalysis, speechResult)
      expect(result1.success).toBe(false)
      expect(result1.session.status).toBe("failed")

      // Second attempt should be rejected
      await expect(service.processWhisperAttempt(session.sessionId, audioAnalysis, speechResult)).rejects.toThrow(
        "No attempts remaining",
      )
    })
  })

  describe("getSession", () => {
    it("should retrieve existing session", async () => {
      const createdSession = await service.createSession("user-123", "test")
      const retrievedSession = await service.getSession(createdSession.sessionId)

      expect(retrievedSession).toBeDefined()
      expect(retrievedSession!.sessionId).toBe(createdSession.sessionId)
      expect(retrievedSession!.userId).toBe("user-123")
    })

    it("should return null for non-existent session", async () => {
      const session = await service.getSession("non-existent")
      expect(session).toBeNull()
    })

    it("should mark expired session as expired", async () => {
      const session = await service.createSession("user-123", "test", { sessionExpiry: 1 })

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 10))

      const retrievedSession = await service.getSession(session.sessionId)
      expect(retrievedSession!.status).toBe("expired")
    })
  })

  describe("getUserSessions", () => {
    it("should return user sessions", async () => {
      await service.createSession("user-123", "test1")
      await service.createSession("user-123", "test2")
      await service.createSession("user-456", "test3")

      const userSessions = await service.getUserSessions("user-123")
      expect(userSessions).toHaveLength(2)
      expect(userSessions.every((s) => s.userId === "user-123")).toBe(true)
    })

    it("should return empty array for user with no sessions", async () => {
      const userSessions = await service.getUserSessions("non-existent-user")
      expect(userSessions).toHaveLength(0)
    })
  })

  describe("getUserStatistics", () => {
    it("should calculate user statistics correctly", async () => {
      // Create and complete some sessions
      const session1 = await service.createSession("user-123", "test")
      const session2 = await service.createSession("user-123", "test")

      const audioAnalysis: AudioAnalysis = {
        averageDecibel: -25,
        peakDecibel: -20,
        duration: 2000,
        frequency: 440,
        isWhisperLevel: true,
        noiseFloor: -45,
        speechDetected: true,
      }

      const speechResult: SpeechRecognitionResult = {
        transcript: "test",
        confidence: 0.9,
        language: "en-US",
        isFinal: true,
      }

      // Complete first session
      await service.processWhisperAttempt(session1.sessionId, audioAnalysis, speechResult)

      // Fail second session
      const wrongSpeechResult: SpeechRecognitionResult = {
        transcript: "wrong",
        confidence: 0.9,
        language: "en-US",
        isFinal: true,
      }
      await service.processWhisperAttempt(session2.sessionId, audioAnalysis, wrongSpeechResult)

      const stats = await service.getUserStatistics("user-123")

      expect(stats.totalSessions).toBe(2)
      expect(stats.completedSessions).toBe(1)
      expect(stats.failedSessions).toBe(0) // Session is still active after one failed attempt
      expect(stats.successRate).toBe(50)
      expect(stats.totalAttempts).toBe(2)
    })
  })

  describe("endSession", () => {
    it("should end active session", async () => {
      const session = await service.createSession("user-123", "test")
      await service.endSession(session.sessionId)

      const retrievedSession = await service.getSession(session.sessionId)
      expect(retrievedSession!.status).toBe("failed")
    })

    it("should throw error for non-existent session", async () => {
      await expect(service.endSession("non-existent")).rejects.toThrow("Session not found")
    })
  })

  describe("validation methods", () => {
    it("should validate audio analysis correctly", async () => {
      const session = await service.createSession("user-123", "test")

      const invalidAudioAnalysis = {
        averageDecibel: -25,
        peakDecibel: -20,
        duration: 500, // Too short
        frequency: 440,
        isWhisperLevel: true,
        noiseFloor: -45,
        speechDetected: false, // No speech detected
      }

      const speechResult: SpeechRecognitionResult = {
        transcript: "test",
        confidence: 0.9,
        language: "en-US",
        isFinal: true,
      }

      await expect(
        service.processWhisperAttempt(session.sessionId, invalidAudioAnalysis, speechResult),
      ).rejects.toThrow()
    })

    it("should validate speech result correctly", async () => {
      const session = await service.createSession("user-123", "test")

      const audioAnalysis: AudioAnalysis = {
        averageDecibel: -25,
        peakDecibel: -20,
        duration: 2000,
        frequency: 440,
        isWhisperLevel: true,
        noiseFloor: -45,
        speechDetected: true,
      }

      const invalidSpeechResult = {
        transcript: "", // Empty transcript
        confidence: 0.9,
        language: "en-US",
        isFinal: true,
      }

      await expect(
        service.processWhisperAttempt(session.sessionId, audioAnalysis, invalidSpeechResult),
      ).rejects.toThrow("No transcript available")
    })
  })

  describe("password matching", () => {
    it("should handle case insensitive matching", async () => {
      const session = await service.createSession("user-123", "Hello World", {
        caseSensitive: false,
      })

      const audioAnalysis: AudioAnalysis = {
        averageDecibel: -25,
        peakDecibel: -20,
        duration: 2000,
        frequency: 440,
        isWhisperLevel: true,
        noiseFloor: -45,
        speechDetected: true,
      }

      const speechResult: SpeechRecognitionResult = {
        transcript: "hello world",
        confidence: 0.9,
        language: "en-US",
        isFinal: true,
      }

      const result = await service.processWhisperAttempt(session.sessionId, audioAnalysis, speechResult)
      expect(result.success).toBe(true)
      expect(result.attempt.passwordMatch).toBe(true)
    })

    it("should handle partial matching", async () => {
      const session = await service.createSession("user-123", "hello world", {
        requireExactMatch: false,
        allowPartialMatch: true,
        partialMatchThreshold: 0.8,
      })

      const audioAnalysis: AudioAnalysis = {
        averageDecibel: -25,
        peakDecibel: -20,
        duration: 2000,
        frequency: 440,
        isWhisperLevel: true,
        noiseFloor: -45,
        speechDetected: true,
      }

      const speechResult: SpeechRecognitionResult = {
        transcript: "hello word", // Close but not exact
        confidence: 0.9,
        language: "en-US",
        isFinal: true,
      }

      const result = await service.processWhisperAttempt(session.sessionId, audioAnalysis, speechResult)
      expect(result.success).toBe(true)
      expect(result.attempt.passwordMatch).toBe(true)
    })
  })
})
