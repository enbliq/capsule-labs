import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { EchoCapsuleService } from "../services/echo-capsule.service"
import { AudioAnalysisService } from "../services/audio-analysis.service"
import { EchoCapsule } from "../entities/echo-capsule.entity"
import { SoundPattern } from "../enums/sound-pattern.enum"
import { NotFoundException, BadRequestException } from "@nestjs/common"

describe("EchoCapsuleService", () => {
  let service: EchoCapsuleService
  let repository: Repository<EchoCapsule>
  let audioAnalysisService: AudioAnalysisService

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  }

  const mockAudioAnalysisService = {
    validateAudioSpecs: jest.fn(),
    analyzeAudio: jest.fn(),
    detectSoundPattern: jest.fn(),
    generateFingerprint: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EchoCapsuleService,
        {
          provide: getRepositoryToken(EchoCapsule),
          useValue: mockRepository,
        },
        {
          provide: AudioAnalysisService,
          useValue: mockAudioAnalysisService,
        },
      ],
    }).compile()

    service = module.get<EchoCapsuleService>(EchoCapsuleService)
    repository = module.get<Repository<EchoCapsule>>(getRepositoryToken(EchoCapsule))
    audioAnalysisService = module.get<AudioAnalysisService>(AudioAnalysisService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("create", () => {
    it("should create a new echo capsule", async () => {
      const createDto = {
        soundPattern: SoundPattern.WHISTLE,
        title: "Test Whistle Capsule",
        content: "Secret message",
        createdBy: "testuser",
        confidenceThreshold: 0.9,
      }

      const expectedCapsule = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        soundPattern: SoundPattern.WHISTLE,
        title: "Test Whistle Capsule",
        content: "Secret message",
        createdBy: "testuser",
        confidenceThreshold: 0.9,
        unlocked: false,
        unlockedAt: null,
        unlockAttempts: [],
      }

      mockRepository.create.mockReturnValue(expectedCapsule)
      mockRepository.save.mockResolvedValue(expectedCapsule)

      const result = await service.create(createDto)

      expect(mockRepository.create).toHaveBeenCalledWith({
        soundPattern: SoundPattern.WHISTLE,
        title: "Test Whistle Capsule",
        content: "Secret message",
        createdBy: "testuser",
        confidenceThreshold: 0.9,
        referenceAudioPath: undefined,
        unlocked: false,
        unlockedAt: null,
        unlockAttempts: [],
      })
      expect(result).toEqual(expectedCapsule)
    })

    it("should use default confidence threshold when not provided", async () => {
      const createDto = {
        soundPattern: SoundPattern.CLAP,
        title: "Test Clap Capsule",
      }

      const expectedCapsule = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        soundPattern: SoundPattern.CLAP,
        confidenceThreshold: 0.8, // Default value
        unlocked: false,
        unlockAttempts: [],
      }

      mockRepository.create.mockReturnValue(expectedCapsule)
      mockRepository.save.mockResolvedValue(expectedCapsule)

      await service.create(createDto)

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          confidenceThreshold: 0.8,
        }),
      )
    })
  })

  describe("submitAudio", () => {
    const mockCapsule = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      soundPattern: SoundPattern.WHISTLE,
      confidenceThreshold: 0.8,
      unlocked: false,
      unlockAttempts: [],
    }

    const mockAudioBuffer = Buffer.from("fake audio data")
    const submitDto = {
      capsuleId: "123e4567-e89b-12d3-a456-426614174000",
      audioFormat: "wav" as any,
    }

    it("should successfully unlock capsule with valid audio", async () => {
      mockRepository.findOne.mockResolvedValue(mockCapsule)
      mockAudioAnalysisService.validateAudioSpecs.mockReturnValue({
        valid: true,
        issues: [],
        specs: { size: 1000, format: "wav" },
      })
      mockAudioAnalysisService.analyzeAudio.mockResolvedValue({
        spectralCentroid: [3000],
        mfcc: [[1, 2, 3]],
        zcr: [0.1],
        rms: [0.8],
        duration: 2.0,
        sampleRate: 44100,
        channels: 1,
      })
      mockAudioAnalysisService.detectSoundPattern.mockResolvedValue({
        detected: true,
        confidence: 0.95,
        detectedPattern: SoundPattern.WHISTLE,
      })
      mockAudioAnalysisService.generateFingerprint.mockResolvedValue("fingerprint123")
      mockRepository.save.mockResolvedValue({
        ...mockCapsule,
        unlocked: true,
        unlockedAt: new Date(),
      })

      const result = await service.submitAudio(submitDto, mockAudioBuffer, "test.wav")

      expect(result.detected).toBe(true)
      expect(result.confidence).toBe(0.95)
      expect(result.unlocked).toBe(true)
      expect(result.detectedPattern).toBe(SoundPattern.WHISTLE)
      expect(mockRepository.save).toHaveBeenCalled()
    })

    it("should not unlock capsule with low confidence", async () => {
      mockRepository.findOne.mockResolvedValue(mockCapsule)
      mockAudioAnalysisService.validateAudioSpecs.mockReturnValue({
        valid: true,
        issues: [],
        specs: { size: 1000, format: "wav" },
      })
      mockAudioAnalysisService.analyzeAudio.mockResolvedValue({
        spectralCentroid: [1000],
        mfcc: [[1, 2, 3]],
        zcr: [0.3],
        rms: [0.4],
        duration: 1.0,
        sampleRate: 44100,
        channels: 1,
      })
      mockAudioAnalysisService.detectSoundPattern.mockResolvedValue({
        detected: false,
        confidence: 0.5, // Below threshold
        detectedPattern: null,
      })
      mockAudioAnalysisService.generateFingerprint.mockResolvedValue("fingerprint456")
      mockRepository.save.mockResolvedValue(mockCapsule)

      const result = await service.submitAudio(submitDto, mockAudioBuffer, "test.wav")

      expect(result.detected).toBe(false)
      expect(result.confidence).toBe(0.5)
      expect(result.unlocked).toBe(false)
      expect(result.detectedPattern).toBe(null)
    })

    it("should throw NotFoundException for invalid capsule ID", async () => {
      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.submitAudio(submitDto, mockAudioBuffer)).rejects.toThrow(NotFoundException)
    })

    it("should throw BadRequestException for invalid audio", async () => {
      mockRepository.findOne.mockResolvedValue(mockCapsule)
      mockAudioAnalysisService.validateAudioSpecs.mockReturnValue({
        valid: false,
        issues: ["File too large", "Invalid format"],
        specs: {},
      })

      await expect(service.submitAudio(submitDto, mockAudioBuffer)).rejects.toThrow(BadRequestException)
    })

    it("should return success for already unlocked capsule", async () => {
      const unlockedCapsule = {
        ...mockCapsule,
        unlocked: true,
        unlockedAt: new Date(),
      }
      mockRepository.findOne.mockResolvedValue(unlockedCapsule)

      const result = await service.submitAudio(submitDto, mockAudioBuffer)

      expect(result.unlocked).toBe(true)
      expect(result.confidence).toBe(1.0)
      expect(result.analysis.message).toContain("already unlocked")
    })
  })

  describe("updateConfidenceThreshold", () => {
    it("should update confidence threshold successfully", async () => {
      const capsule = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        confidenceThreshold: 0.8,
      }
      const newThreshold = 0.9

      mockRepository.findOne.mockResolvedValue(capsule)
      mockRepository.save.mockResolvedValue({
        ...capsule,
        confidenceThreshold: newThreshold,
      })

      const result = await service.updateConfidenceThreshold(capsule.id, newThreshold)

      expect(result.confidenceThreshold).toBe(newThreshold)
      expect(mockRepository.save).toHaveBeenCalled()
    })

    it("should throw BadRequestException for invalid threshold", async () => {
      await expect(service.updateConfidenceThreshold("capsule-id", 1.5)).rejects.toThrow(BadRequestException)
      await expect(service.updateConfidenceThreshold("capsule-id", -0.1)).rejects.toThrow(BadRequestException)
    })
  })

  describe("getStatistics", () => {
    it("should return global statistics", async () => {
      const mockCapsules = [
        {
          id: "1",
          soundPattern: SoundPattern.WHISTLE,
          unlocked: true,
          unlockAttempts: [{ confidence: 0.9 }, { confidence: 0.8 }],
        },
        {
          id: "2",
          soundPattern: SoundPattern.CLAP,
          unlocked: false,
          unlockAttempts: [{ confidence: 0.6 }],
        },
      ]

      mockRepository.find.mockResolvedValue(mockCapsules)

      const result = await service.getStatistics()

      expect(result.totalCapsules).toBe(2)
      expect(result.unlockedCapsules).toBe(1)
      expect(result.lockedCapsules).toBe(1)
      expect(result.totalUnlockAttempts).toBe(3)
      expect(result.soundPatternDistribution).toEqual({
        whistle: 1,
        clap: 1,
      })
    })

    it("should return specific capsule statistics", async () => {
      const capsule = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        soundPattern: SoundPattern.WHISTLE,
        unlocked: true,
        unlockedAt: new Date(),
        confidenceThreshold: 0.8,
        unlockAttempts: [
          { confidence: 0.9, detected: true },
          { confidence: 0.7, detected: false },
        ],
      }

      mockRepository.findOne.mockResolvedValue(capsule)

      const result = await service.getStatistics(capsule.id)

      expect(result.capsuleId).toBe(capsule.id)
      expect(result.totalAttempts).toBe(2)
      expect(result.successfulAttempts).toBe(1)
      expect(result.averageConfidence).toBe(0.8)
      expect(result.unlocked).toBe(true)
    })
  })
})
