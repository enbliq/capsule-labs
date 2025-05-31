import { Test, type TestingModule } from "@nestjs/testing"
import { VoiceLockCapsuleController } from "../voice-lock-capsule.controller"
import { VoiceLockCapsuleService } from "../voice-lock-capsule.service"
import type { CreateVoiceLockCapsuleDto } from "../dto/create-voice-lock-capsule.dto"
import type { SubmitVoiceDto } from "../dto/submit-voice.dto"
import type { ViewVoiceLockCapsuleDto } from "../dto/view-voice-lock-capsule.dto"

describe("VoiceLockCapsuleController", () => {
  let controller: VoiceLockCapsuleController
  let service: VoiceLockCapsuleService

  const mockVoiceLockCapsuleService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    unlockCapsule: jest.fn(),
    getUnlockAttempts: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoiceLockCapsuleController],
      providers: [
        {
          provide: VoiceLockCapsuleService,
          useValue: mockVoiceLockCapsuleService,
        },
      ],
    }).compile()

    controller = module.get<VoiceLockCapsuleController>(VoiceLockCapsuleController)
    service = module.get<VoiceLockCapsuleService>(VoiceLockCapsuleService)
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
  })

  describe("create", () => {
    it("should create a voice lock capsule", async () => {
      const createDto: CreateVoiceLockCapsuleDto = {
        title: "Test Capsule",
        content: "Test Content",
        passphrase: "open sesame",
        voiceSample: "base64encodedaudio",
      }

      const userId = "user123"

      const capsule = {
        id: "capsule123",
        title: createDto.title,
        content: createDto.content,
        userId,
        passphrase: createDto.passphrase,
        voicePrintHash: "mockhash123",
        caseSensitive: false,
        confidenceThreshold: 0.7,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockVoiceLockCapsuleService.create.mockResolvedValue(capsule)

      const result = await controller.create(createDto, { user: { id: userId } })

      expect(service.create).toHaveBeenCalledWith(createDto, userId)
      expect(result).toEqual({
        id: capsule.id,
        title: capsule.title,
        isLocked: true,
        createdAt: capsule.createdAt,
        updatedAt: capsule.updatedAt,
      })
    })
  })

  describe("unlockCapsule", () => {
    it("should try to unlock a capsule with voice sample", async () => {
      const submitVoiceDto: SubmitVoiceDto = {
        voiceSample: "base64encodedaudio",
      }

      const userId = "user123"

      const viewDto: ViewVoiceLockCapsuleDto = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        isLocked: false,
        passphrase: "open sesame",
        recognizedText: "open sesame",
        confidenceScore: 0.9,
        voiceMatchScore: 0.8,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockVoiceLockCapsuleService.unlockCapsule.mockResolvedValue(viewDto)

      const result = await controller.unlockCapsule("capsule123", submitVoiceDto, { user: { id: userId } })

      expect(service.unlockCapsule).toHaveBeenCalledWith("capsule123", submitVoiceDto, userId)
      expect(result).toEqual(viewDto)
    })
  })

  describe("findAll", () => {
    it("should return all voice lock capsules for the user", async () => {
      const userId = "user123"

      const capsules = [
        {
          id: "capsule123",
          title: "Test Capsule 1",
          content: "Secret Content 1",
          userId,
          passphrase: "open sesame",
          voicePrintHash: "mockhash123",
          caseSensitive: false,
          confidenceThreshold: 0.7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "capsule456",
          title: "Test Capsule 2",
          content: "Secret Content 2",
          userId,
          passphrase: "hello world",
          voicePrintHash: "mockhash456",
          caseSensitive: true,
          confidenceThreshold: 0.8,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockVoiceLockCapsuleService.findAll.mockResolvedValue(capsules)

      const result = await controller.findAll({ user: { id: userId } })

      expect(service.findAll).toHaveBeenCalledWith(userId)
      expect(result).toEqual([
        {
          id: "capsule123",
          title: "Test Capsule 1",
          isLocked: true,
          createdAt: capsules[0].createdAt,
          updatedAt: capsules[0].updatedAt,
        },
        {
          id: "capsule456",
          title: "Test Capsule 2",
          isLocked: true,
          createdAt: capsules[1].createdAt,
          updatedAt: capsules[1].updatedAt,
        },
      ])
    })
  })
})
