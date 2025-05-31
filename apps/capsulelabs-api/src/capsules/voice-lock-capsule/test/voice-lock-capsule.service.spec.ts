import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { VoiceLockCapsuleService } from "../voice-lock-capsule.service"
import { VoiceRecognitionService } from "../services/voice-recognition.service"
import { VoiceLockCapsule } from "../entities/voice-lock-capsule.entity"
import { VoiceUnlockAttempt } from "../entities/voice-unlock-attempt.entity"
import type { CreateVoiceLockCapsuleDto } from "../dto/create-voice-lock-capsule.dto"
import type { SubmitVoiceDto } from "../dto/submit-voice.dto"
import { NotFoundException } from "@nestjs/common"

describe("VoiceLockCapsuleService", () => {
  let service: VoiceLockCapsuleService
  let voiceRecognitionService: VoiceRecognitionService
  let capsuleRepository: Repository<VoiceLockCapsule>
  let attemptRepository: Repository<VoiceUnlockAttempt>

  const mockCapsuleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }

  const mockAttemptRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  const mockVoiceRecognitionService = {
    generateVoicePrintHash: jest.fn(),
    recognizeSpeech: jest.fn(),
    compareVoicePrint: jest.fn(),
    comparePhrases: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceLockCapsuleService,
        {
          provide: getRepositoryToken(VoiceLockCapsule),
          useValue: mockCapsuleRepository,
        },
        {
          provide: getRepositoryToken(VoiceUnlockAttempt),
          useValue: mockAttemptRepository,
        },
        {
          provide: VoiceRecognitionService,
          useValue: mockVoiceRecognitionService,
        },
      ],
    }).compile()

    service = module.get<VoiceLockCapsuleService>(VoiceLockCapsuleService)
    voiceRecognitionService = module.get<VoiceRecognitionService>(VoiceRecognitionService)
    capsuleRepository = module.get<Repository<VoiceLockCapsule>>(getRepositoryToken(VoiceLockCapsule))
    attemptRepository = module.get<Repository<VoiceUnlockAttempt>>(getRepositoryToken(VoiceUnlockAttempt))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("create", () => {
    it("should create a new voice lock capsule", async () => {
      const createDto: CreateVoiceLockCapsuleDto = {
        title: "Test Capsule",
        content: "Test Content",
        passphrase: "open sesame",
        voiceSample: "base64encodedaudio",
      }

      const userId = "user123"
      const voicePrintHash = "mockhash123"

      mockVoiceRecognitionService.generateVoicePrintHash.mockReturnValue(voicePrintHash)

      const capsule = {
        id: "capsule123",
        title: createDto.title,
        content: createDto.content,
        userId,
        passphrase: createDto.passphrase,
        voicePrintHash,
        caseSensitive: false,
        confidenceThreshold: 0.7,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockCapsuleRepository.create.mockReturnValue(capsule)
      mockCapsuleRepository.save.mockResolvedValue(capsule)

      const result = await service.create(createDto, userId)

      expect(mockVoiceRecognitionService.generateVoicePrintHash).toHaveBeenCalledWith(createDto.voiceSample)
      expect(mockCapsuleRepository.create).toHaveBeenCalledWith({
        title: createDto.title,
        content: createDto.content,
        userId,
        passphrase: createDto.passphrase,
        voicePrintHash,
        caseSensitive: false,
        confidenceThreshold: 0.7,
      })
      expect(mockCapsuleRepository.save).toHaveBeenCalledWith(capsule)
      expect(result).toEqual(capsule)
    })
  })

  describe("unlockCapsule", () => {
    it("should unlock capsule when voice verification is successful", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        passphrase: "open sesame",
        voicePrintHash: "mockhash123",
        caseSensitive: false,
        confidenceThreshold: 0.7,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const submitVoiceDto: SubmitVoiceDto = {
        voiceSample: "base64encodedaudio;text=open sesame;match=0.8",
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)

      mockVoiceRecognitionService.recognizeSpeech.mockReturnValue({
        recognizedText: "open sesame",
        confidenceScore: 0.9,
      })

      mockVoiceRecognitionService.comparePhrases.mockReturnValue(1.0)

      mockVoiceRecognitionService.compareVoicePrint.mockReturnValue({
        isMatch: true,
        matchScore: 0.8,
      })

      mockAttemptRepository.create.mockReturnValue({
        capsuleId: capsule.id,
        userId: capsule.userId,
        recognizedText: "open sesame",
        confidenceScore: 0.9,
        voiceMatchScore: 0.8,
        successful: true,
      })

      mockAttemptRepository.save.mockResolvedValue({})

      const result = await service.unlockCapsule("capsule123", submitVoiceDto, "user123")

      expect(result.isLocked).toBe(false)
      expect(result.content).toBe("Secret Content")
      expect(result.passphrase).toBe("open sesame")
      expect(result.recognizedText).toBe("open sesame")
      expect(result.confidenceScore).toBe(0.9)
      expect(result.voiceMatchScore).toBe(0.8)

      expect(mockAttemptRepository.create).toHaveBeenCalledWith({
        capsuleId: capsule.id,
        userId: capsule.userId,
        recognizedText: "open sesame",
        confidenceScore: 0.9,
        voiceMatchScore: 0.8,
        successful: true,
      })
    })

    it("should keep capsule locked when phrase doesn't match", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        passphrase: "open sesame",
        voicePrintHash: "mockhash123",
        caseSensitive: false,
        confidenceThreshold: 0.7,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const submitVoiceDto: SubmitVoiceDto = {
        voiceSample: "base64encodedaudio;text=wrong phrase;match=0.8",
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)

      mockVoiceRecognitionService.recognizeSpeech.mockReturnValue({
        recognizedText: "wrong phrase",
        confidenceScore: 0.9,
      })

      mockVoiceRecognitionService.comparePhrases.mockReturnValue(0.2)

      mockVoiceRecognitionService.compareVoicePrint.mockReturnValue({
        isMatch: true,
        matchScore: 0.8,
      })

      mockAttemptRepository.create.mockReturnValue({
        capsuleId: capsule.id,
        userId: capsule.userId,
        recognizedText: "wrong phrase",
        confidenceScore: 0.9,
        voiceMatchScore: 0.8,
        successful: false,
      })

      mockAttemptRepository.save.mockResolvedValue({})

      const result = await service.unlockCapsule("capsule123", submitVoiceDto, "user123")

      expect(result.isLocked).toBe(true)
      expect(result.content).toBeUndefined()
      expect(result.passphrase).toBeUndefined()
      expect(result.recognizedText).toBe("wrong phrase")
    })

    it("should keep capsule locked when voice doesn't match", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        passphrase: "open sesame",
        voicePrintHash: "mockhash123",
        caseSensitive: false,
        confidenceThreshold: 0.7,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const submitVoiceDto: SubmitVoiceDto = {
        voiceSample: "base64encodedaudio;text=open sesame;match=0.5",
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)

      mockVoiceRecognitionService.recognizeSpeech.mockReturnValue({
        recognizedText: "open sesame",
        confidenceScore: 0.9,
      })

      mockVoiceRecognitionService.comparePhrases.mockReturnValue(1.0)

      mockVoiceRecognitionService.compareVoicePrint.mockReturnValue({
        isMatch: false,
        matchScore: 0.5,
      })

      mockAttemptRepository.create.mockReturnValue({
        capsuleId: capsule.id,
        userId: capsule.userId,
        recognizedText: "open sesame",
        confidenceScore: 0.9,
        voiceMatchScore: 0.5,
        successful: false,
      })

      mockAttemptRepository.save.mockResolvedValue({})

      const result = await service.unlockCapsule("capsule123", submitVoiceDto, "user123")

      expect(result.isLocked).toBe(true)
      expect(result.content).toBeUndefined()
      expect(result.passphrase).toBeUndefined()
      expect(result.voiceMatchScore).toBe(0.5)
    })

    it("should throw an error if capsule not found", async () => {
      mockCapsuleRepository.findOne.mockResolvedValue(null)

      await expect(service.unlockCapsule("nonexistent", { voiceSample: "audio" }, "user123")).rejects.toThrow(
        NotFoundException,
      )
    })

    it("should throw an error if user doesn't own the capsule", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        passphrase: "open sesame",
        voicePrintHash: "mockhash123",
        caseSensitive: false,
        confidenceThreshold: 0.7,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)

      await expect(service.unlockCapsule("capsule123", { voiceSample: "audio" }, "different-user")).rejects.toThrow(
        "You don't have permission to access this capsule",
      )
    })
  })
})
