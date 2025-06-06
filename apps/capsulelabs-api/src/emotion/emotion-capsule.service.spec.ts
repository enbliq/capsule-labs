import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { NotFoundException } from "@nestjs/common"
import { EmotionCapsuleService } from "./emotion-capsule.service"
import { EmotionCapsule } from "./entities/emotion-capsule.entity"
import type { CreateEmotionCapsuleDto } from "./dto/create-emotion-capsule.dto"
import type { SubmitEmotionDto } from "./dto/submit-emotion.dto"
import { EmotionType } from "./enums/emotion-type.enum"

describe("EmotionCapsuleService", () => {
  let service: EmotionCapsuleService
  let repository: Repository<EmotionCapsule>

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmotionCapsuleService,
        {
          provide: getRepositoryToken(EmotionCapsule),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<EmotionCapsuleService>(EmotionCapsuleService)
    repository = module.get<Repository<EmotionCapsule>>(getRepositoryToken(EmotionCapsule))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("create", () => {
    it("should create an emotion capsule successfully", async () => {
      const createDto: CreateEmotionCapsuleDto = {
        title: "Test Emotion Capsule",
        content: "Secret content",
        targetEmotion: EmotionType.HAPPY,
        detectionConfidence: 0.8,
        userId: "user123",
      }

      const mockCapsule = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        ...createDto,
        unlocked: false,
        unlockAttempts: 0,
        lastUnlockAttempt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.create.mockReturnValue(mockCapsule)
      mockRepository.save.mockResolvedValue(mockCapsule)

      const result = await service.create(createDto)

      expect(mockRepository.create).toHaveBeenCalledWith(createDto)
      expect(mockRepository.save).toHaveBeenCalledWith(mockCapsule)
      expect(result.title).toBe(createDto.title)
      expect(result.content).toBeUndefined() // Content should be hidden until unlocked
      expect(result.unlocked).toBe(false)
    })
  })

  describe("attemptUnlock", () => {
    it("should unlock capsule when emotion and confidence match", async () => {
      const capsuleId = "123e4567-e89b-12d3-a456-426614174000"
      const submitDto: SubmitEmotionDto = {
        emotion: EmotionType.HAPPY,
        confidence: 0.9,
      }

      const mockCapsule = {
        id: capsuleId,
        title: "Test Emotion Capsule",
        content: "Secret content",
        targetEmotion: EmotionType.HAPPY,
        detectionConfidence: 0.8,
        unlocked: false,
        unlockAttempts: 0,
        lastUnlockAttempt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedCapsule = {
        ...mockCapsule,
        unlocked: true,
        unlockAttempts: 1,
        lastUnlockAttempt: new Date(),
      }

      mockRepository.findOne.mockResolvedValue(mockCapsule)
      mockRepository.save.mockResolvedValue(updatedCapsule)

      const result = await service.attemptUnlock(capsuleId, submitDto)

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: capsuleId },
      })
      expect(mockRepository.save).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.content).toBe("Secret content")
      expect(result.unlocked).toBe(true)
      expect(result.emotionMatch).toBe(true)
      expect(result.confidenceMatch).toBe(true)
    })

    it("should fail when emotion doesn't match", async () => {
      const capsuleId = "123e4567-e89b-12d3-a456-426614174000"
      const submitDto: SubmitEmotionDto = {
        emotion: EmotionType.SAD,
        confidence: 0.9,
      }

      const mockCapsule = {
        id: capsuleId,
        title: "Test Emotion Capsule",
        content: "Secret content",
        targetEmotion: EmotionType.HAPPY,
        detectionConfidence: 0.8,
        unlocked: false,
        unlockAttempts: 0,
        lastUnlockAttempt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedCapsule = {
        ...mockCapsule,
        unlockAttempts: 1,
        lastUnlockAttempt: new Date(),
      }

      mockRepository.findOne.mockResolvedValue(mockCapsule)
      mockRepository.save.mockResolvedValue(updatedCapsule)

      const result = await service.attemptUnlock(capsuleId, submitDto)

      expect(mockRepository.save).toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(result.content).toBeUndefined()
      expect(result.unlocked).toBe(false)
      expect(result.emotionMatch).toBe(false)
      expect(result.confidenceMatch).toBe(true)
    })

    it("should fail when confidence is too low", async () => {
      const capsuleId = "123e4567-e89b-12d3-a456-426614174000"
      const submitDto: SubmitEmotionDto = {
        emotion: EmotionType.HAPPY,
        confidence: 0.7,
      }

      const mockCapsule = {
        id: capsuleId,
        title: "Test Emotion Capsule",
        content: "Secret content",
        targetEmotion: EmotionType.HAPPY,
        detectionConfidence: 0.8,
        unlocked: false,
        unlockAttempts: 0,
        lastUnlockAttempt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedCapsule = {
        ...mockCapsule,
        unlockAttempts: 1,
        lastUnlockAttempt: new Date(),
      }

      mockRepository.findOne.mockResolvedValue(mockCapsule)
      mockRepository.save.mockResolvedValue(updatedCapsule)

      const result = await service.attemptUnlock(capsuleId, submitDto)

      expect(mockRepository.save).toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(result.content).toBeUndefined()
      expect(result.unlocked).toBe(false)
      expect(result.emotionMatch).toBe(true)
      expect(result.confidenceMatch).toBe(false)
    })

    it("should throw NotFoundException when capsule not found", async () => {
      const capsuleId = "non-existent-id"
      const submitDto: SubmitEmotionDto = {
        emotion: EmotionType.HAPPY,
        confidence: 0.9,
      }

      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.attemptUnlock(capsuleId, submitDto)).rejects.toThrow(NotFoundException)
    })
  })

  describe("findOne", () => {
    it("should return a capsule by id", async () => {
      const capsuleId = "123e4567-e89b-12d3-a456-426614174000"
      const mockCapsule = {
        id: capsuleId,
        title: "Test Emotion Capsule",
        content: "Secret content",
        targetEmotion: EmotionType.HAPPY,
        detectionConfidence: 0.8,
        unlocked: false,
        unlockAttempts: 0,
        lastUnlockAttempt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.findOne.mockResolvedValue(mockCapsule)

      const result = await service.findOne(capsuleId)

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: capsuleId },
      })
      expect(result.id).toBe(capsuleId)
      expect(result.content).toBeUndefined() // Content should be hidden
    })

    it("should return content when capsule is unlocked", async () => {
      const capsuleId = "123e4567-e89b-12d3-a456-426614174000"
      const mockCapsule = {
        id: capsuleId,
        title: "Test Emotion Capsule",
        content: "Secret content",
        targetEmotion: EmotionType.HAPPY,
        detectionConfidence: 0.8,
        unlocked: true, // Capsule is unlocked
        unlockAttempts: 1,
        lastUnlockAttempt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.findOne.mockResolvedValue(mockCapsule)

      const result = await service.findOne(capsuleId)

      expect(result.content).toBe("Secret content") // Content should be visible
    })

    it("should throw NotFoundException when capsule not found", async () => {
      const capsuleId = "non-existent-id"

      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.findOne(capsuleId)).rejects.toThrow(NotFoundException)
    })
  })
})
