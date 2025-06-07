import { Test, type TestingModule } from "@nestjs/testing"
import { ConfigService } from "@nestjs/config"
import { FaceTrackingChallengeService } from "../face-tracking-challenge.service"
import { jest } from "@jest/globals"

describe("FaceTrackingChallengeService", () => {
  let service: FaceTrackingChallengeService
  let configService: ConfigService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaceTrackingChallengeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              const config = {
                FACE_TRACKING_DURATION: 5000, // 5 seconds for testing
                FACE_TRACKING_CENTER_TOLERANCE: 0.2,
                FACE_TRACKING_MIN_CONFIDENCE: 0.7,
                FACE_TRACKING_MAX_ROTATION: 15,
                FACE_TRACKING_MIN_FACE_SIZE: 0.1,
                FACE_TRACKING_MAX_FACE_SIZE: 0.8,
                FACE_TRACKING_ALLOW_MULTIPLE_FACES: false,
                FACE_TRACKING_STABILITY_THRESHOLD: 1000,
                FACE_TRACKING_MAX_VIOLATION_DURATION: 2000,
                FACE_TRACKING_FREQUENCY: 10,
                FACE_TRACKING_SESSION_EXPIRY: 300000,
              }
              return config[key] || defaultValue
            }),
          },
        },
      ],
    }).compile()

    service = module.get<FaceTrackingChallengeService>(FaceTrackingChallengeService)
    configService = module.get<ConfigService>(ConfigService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createSession", () => {
    it("should create a new face tracking session", () => {
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
        requiredDuration: 15000,
        centerTolerance: 0.1,
        minConfidence: 0.8,
      }

      const result = service.createSession(userId, customSettings)
      const session = service.getSessionStatus(result.sessionId)

      expect(session?.settings.requiredDuration).toBe(15000)
      expect(session?.settings.centerTolerance).toBe(0.1)
      expect(session?.settings.minConfidence).toBe(0.8)
    })
  })

  describe("startSession", () => {
    it("should start a face tracking session", () => {
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

  describe("processFaceDetection", () => {
    it("should process valid face detection", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId)
      service.startSession(sessionId)

      const validDetection = {
        confidence: 0.95,
        position: {
          x: 0.5, // centered
          y: 0.5, // centered
          width: 0.3,
          height: 0.4,
          rotation: 0, // no rotation
          distance: 0.5,
        },
        landmarks: {
          leftEye: { x: 0.45, y: 0.45 },
          rightEye: { x: 0.55, y: 0.45 },
          nose: { x: 0.5, y: 0.5 },
          mouth: { x: 0.5, y: 0.55 },
        },
      }

      const result = service.processFaceDetection(sessionId, [validDetection])
      expect(result.success).toBe(true)
      expect(result.isValid).toBe(true)
      expect(result.violations).toHaveLength(0)

      const session = service.getSessionStatus(sessionId)
      expect(session?.faceDetections).toHaveLength(1)
      expect(session?.faceDetections[0].isValid).toBe(true)
    })

    it("should detect off-center face", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId)
      service.startSession(sessionId)

      const offCenterDetection = {
        confidence: 0.95,
        position: {
          x: 0.8, // off-center
          y: 0.5,
          width: 0.3,
          height: 0.4,
          rotation: 0,
          distance: 0.5,
        },
      }

      const result = service.processFaceDetection(sessionId, [offCenterDetection])
      expect(result.success).toBe(true)
      expect(result.isValid).toBe(false)
      expect(result.violations).toContain("Face not centered")
    })

    it("should detect low confidence", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId)
      service.startSession(sessionId)

      const lowConfidenceDetection = {
        confidence: 0.5, // below threshold
        position: {
          x: 0.5,
          y: 0.5,
          width: 0.3,
          height: 0.4,
          rotation: 0,
          distance: 0.5,
        },
      }

      const result = service.processFaceDetection(sessionId, [lowConfidenceDetection])
      expect(result.success).toBe(true)
      expect(result.isValid).toBe(false)
      expect(result.violations.some((v) => v.includes("Low confidence"))).toBe(true)
    })

    it("should detect excessive rotation", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId)
      service.startSession(sessionId)

      const rotatedDetection = {
        confidence: 0.95,
        position: {
          x: 0.5,
          y: 0.5,
          width: 0.3,
          height: 0.4,
          rotation: 30, // exceeds 15 degree limit
          distance: 0.5,
        },
      }

      const result = service.processFaceDetection(sessionId, [rotatedDetection])
      expect(result.success).toBe(true)
      expect(result.isValid).toBe(false)
      expect(result.violations.some((v) => v.includes("Excessive rotation"))).toBe(true)
    })

    it("should detect no face", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId)
      service.startSession(sessionId)

      const result = service.processFaceDetection(sessionId, []) // no detections
      expect(result.success).toBe(true)
      expect(result.isValid).toBe(false)
      expect(result.violations).toContain("No face detected")
    })

    it("should detect multiple faces when not allowed", () => {
      const userId = "test-user"
      const { sessionId } = service.createSession(userId, { allowMultipleFaces: false })
      service.startSession(sessionId)

      const detection1 = {
        confidence: 0.95,
        position: { x: 0.3, y: 0.5, width: 0.2, height: 0.3, rotation: 0, distance: 0.5 },
      }

      const detection2 = {
        confidence: 0.9,
        position: { x: 0.7, y: 0.5, width: 0.2, height: 0.3, rotation: 0, distance: 0.5 },
      }

      const result = service.processFaceDetection(sessionId, [detection1, detection2])
      expect(result.success).toBe(true)
      expect(result.isValid).toBe(false)
      expect(result.violations).toContain("Multiple faces detected")
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
      const stats = service.getUserStatistics(userId)

      expect(stats).toHaveProperty("totalSessions")
      expect(stats).toHaveProperty("completedSessions")
      expect(stats).toHaveProperty("totalTrackingTime")
      expect(stats).toHaveProperty("averageSessionDuration")
      expect(stats).toHaveProperty("successRate")
      expect(stats).toHaveProperty("bestSession")
      expect(stats).toHaveProperty("averageConfidence")
      expect(stats).toHaveProperty("currentStreak")
    })
  })
})
