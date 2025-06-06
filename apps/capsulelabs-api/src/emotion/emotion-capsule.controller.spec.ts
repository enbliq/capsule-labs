import { Test, type TestingModule } from "@nestjs/testing"
import { EmotionCapsuleController } from "./emotion-capsule.controller"
import { EmotionCapsuleService } from "./emotion-capsule.service"
import type { CreateEmotionCapsuleDto } from "./dto/create-emotion-capsule.dto"
import type { SubmitEmotionDto } from "./dto/submit-emotion.dto"
import { EmotionType } from "./enums/emotion-type.enum"
import { NotFoundException } from "@nestjs/common"

describe("EmotionCapsuleController", () => {
  let controller: EmotionCapsuleController
  let service: EmotionCapsuleService

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByUser: jest.fn(),
    findOne: jest.fn(),
    attemptUnlock: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmotionCapsuleController],
      providers: [
        {
          provide: EmotionCapsuleService,
          useValue: mockService,
        },
      ],
    }).compile()

    controller = module.get<EmotionCapsuleController>(EmotionCapsuleController)
    service = module.get<EmotionCapsuleService>(EmotionCapsuleService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("create", () => {
    it("should create an emotion capsule", async () => {
      const createDto: CreateEmotionCapsuleDto = {
        title: "Test Emotion Capsule",
        content: "Secret content",
        targetEmotion: EmotionType.HAPPY,
        detectionConfidence: 0.8,
        userId: "user123",
      }

      const expectedResult = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Test Emotion Capsule",
        targetEmotion: EmotionType.HAPPY,
        detectionConfidence: 0.8,
        userId: "user123",
        unlocked: false,
        unlockAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockService.create.mockResolvedValue(expectedResult)

      const result = await controller.create(createDto)

      expect(service.create).toHaveBeenCalledWith(createDto)
      expect(result).toEqual(expectedResult)
    })
  })

  describe("findAll", () => {
    it("should return all capsules when no userId provided", async () => {
      const expectedResult = [
        {
          id: "1",
          title: "Capsule 1",
          targetEmotion: EmotionType.HAPPY,
          detectionConfidence: 0.8,
          unlocked: false,
        },
        {
          id: "2",
          title: "Capsule 2",
          targetEmotion: EmotionType.SAD,
          detectionConfidence: 0.7,
          unlocked: true,
        },
      ]

      mockService.findAll.mockResolvedValue(expectedResult)

      const result = await controller.findAll()

      expect(service.findAll).toHaveBeenCalled()
      expect(result).toEqual(expectedResult)
    })

    it("should return user capsules when userId provided", async () => {
      const userId = "user123"
      const expectedResult = [
        {
          id: "1",
          title: "User Capsule",
          targetEmotion: EmotionType.HAPPY,
          detectionConfidence: 0.8,
          userId,
          unlocked: false,
        },
      ]

      mockService.findByUser.mockResolvedValue(expectedResult)

      const result = await controller.findAll(userId)

      expect(service.findByUser).toHaveBeenCalledWith(userId)
      expect(result).toEqual(expectedResult)
    })
  })

  describe("findOne", () => {
    it("should return a capsule by id", async () => {
      const capsuleId = "123e4567-e89b-12d3-a456-426614174000"
      const expectedResult = {
        id: capsuleId,
        title: "Test Emotion Capsule",
        targetEmotion: EmotionType.HAPPY,
        detectionConfidence: 0.8,
        unlocked: false,
      }

      mockService.findOne.mockResolvedValue(expectedResult)

      const result = await controller.findOne(capsuleId)

      expect(service.findOne).toHaveBeenCalledWith(capsuleId)
      expect(result).toEqual(expectedResult)
    })

    it("should handle not found error", async () => {
      const capsuleId = "non-existent-id"

      mockService.findOne.mockRejectedValue(new NotFoundException())

      await expect(controller.findOne(capsuleId)).rejects.toThrow(NotFoundException)
    })
  })

  describe("unlock", () => {
    it("should process unlock attempt successfully", async () => {
      const capsuleId = "123e4567-e89b-12d3-a456-426614174000"
      const submitDto: SubmitEmotionDto = {
        emotion: EmotionType.HAPPY,
        confidence: 0.9,
      }

      const expectedResult = {
        success: true,
        message: "Capsule unlocked successfully with happy emotion!",
        content: "Secret content",
        unlocked: true,
        emotionMatch: true,
        confidenceMatch: true,
        requiredConfidence: 0.8,
        providedConfidence: 0.9,
        attemptsCount: 1,
      }

      mockService.attemptUnlock.mockResolvedValue(expectedResult)

      const result = await controller.unlock(capsuleId, submitDto)

      expect(service.attemptUnlock).toHaveBeenCalledWith(capsuleId, submitDto)
      expect(result).toEqual(expectedResult)
    })

    it("should handle failed unlock attempt", async () => {
      const capsuleId = "123e4567-e89b-12d3-a456-426614174000"
      const submitDto: SubmitEmotionDto = {
        emotion: EmotionType.SAD,
        confidence: 0.9,
      }

      const expectedResult = {
        success: false,
        message: "Unlock failed: Expected happy emotion but received sad.",
        unlocked: false,
        emotionMatch: false,
        confidenceMatch: true,
        requiredConfidence: 0.8,
        providedConfidence: 0.9,
        attemptsCount: 1,
      }

      mockService.attemptUnlock.mockResolvedValue(expectedResult)

      const result = await controller.unlock(capsuleId, submitDto)

      expect(result.success).toBe(false)
      expect(result.emotionMatch).toBe(false)
    })

    it("should handle not found error", async () => {
      const capsuleId = "non-existent-id"
      const submitDto: SubmitEmotionDto = {
        emotion: EmotionType.HAPPY,
        confidence: 0.9,
      }

      mockService.attemptUnlock.mockRejectedValue(new NotFoundException())

      await expect(controller.unlock(capsuleId, submitDto)).rejects.toThrow(NotFoundException)
    })
  })
})
