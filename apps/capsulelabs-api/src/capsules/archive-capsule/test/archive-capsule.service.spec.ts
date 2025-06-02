import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { ArchiveCapsuleService } from "../archive-capsule.service"
import { MediaEngagementService } from "../services/media-engagement.service"
import { ArchiveCapsule, MediaType } from "../entities/archive-capsule.entity"
import type { CreateArchiveCapsuleDto } from "../dto/create-archive-capsule.dto"
import type { MediaEventDto } from "../dto/media-event.dto"
import { MediaEventType } from "../entities/media-engagement.entity"
import { NotFoundException } from "@nestjs/common"

describe("ArchiveCapsuleService", () => {
  let service: ArchiveCapsuleService
  let mediaEngagementService: MediaEngagementService
  let repository: Repository<ArchiveCapsule>

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }

  const mockMediaEngagementService = {
    startSession: jest.fn(),
    trackMediaEvent: jest.fn(),
    analyzeEngagement: jest.fn(),
    getSessionHistory: jest.fn(),
    endSession: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveCapsuleService,
        {
          provide: getRepositoryToken(ArchiveCapsule),
          useValue: mockRepository,
        },
        {
          provide: MediaEngagementService,
          useValue: mockMediaEngagementService,
        },
      ],
    }).compile()

    service = module.get<ArchiveCapsuleService>(ArchiveCapsuleService)
    mediaEngagementService = module.get<MediaEngagementService>(MediaEngagementService)
    repository = module.get<Repository<ArchiveCapsule>>(getRepositoryToken(ArchiveCapsule))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("create", () => {
    it("should create a new archive capsule", async () => {
      const createDto: CreateArchiveCapsuleDto = {
        title: "Documentary Capsule",
        content: "Educational content",
        mediaUrl: "https://example.com/video.mp4",
        mediaTitle: "Nature Documentary",
        mediaType: MediaType.VIDEO,
        mediaDurationSeconds: 3600, // 1 hour
        minimumEngagementSeconds: 2400, // 40 minutes
        minimumCompletionPercentage: 0.8,
        requireFullCompletion: false,
        allowPausing: true,
        maxPauseTimeSeconds: 300,
      }

      const userId = "user123"

      const capsule = {
        id: "capsule123",
        ...createDto,
        userId,
        unlocked: false,
        totalEngagementSeconds: 0,
        completionPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.create.mockReturnValue(capsule)
      mockRepository.save.mockResolvedValue(capsule)

      const result = await service.create(createDto, userId)

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        userId,
        unlocked: false,
        totalEngagementSeconds: 0,
        completionPercentage: 0,
      })
      expect(mockRepository.save).toHaveBeenCalledWith(capsule)
      expect(result).toEqual(capsule)
    })

    it("should throw error if minimum engagement exceeds media duration", async () => {
      const createDto: CreateArchiveCapsuleDto = {
        title: "Invalid Capsule",
        content: "Test content",
        mediaUrl: "https://example.com/video.mp4",
        mediaTitle: "Short Video",
        mediaType: MediaType.VIDEO,
        mediaDurationSeconds: 300, // 5 minutes
        minimumEngagementSeconds: 600, // 10 minutes - exceeds duration
        minimumCompletionPercentage: 0.8,
      }

      await expect(service.create(createDto, "user123")).rejects.toThrow(
        "Minimum engagement time cannot exceed media duration",
      )
    })

    it("should throw error for inconsistent engagement and completion requirements", async () => {
      const createDto: CreateArchiveCapsuleDto = {
        title: "Inconsistent Capsule",
        content: "Test content",
        mediaUrl: "https://example.com/video.mp4",
        mediaTitle: "Test Video",
        mediaType: MediaType.VIDEO,
        mediaDurationSeconds: 1000, // ~16 minutes
        minimumEngagementSeconds: 900, // 15 minutes (90% of duration)
        minimumCompletionPercentage: 0.5, // But only need to watch 50%
      }

      await expect(service.create(createDto, "user123")).rejects.toThrow(
        "Minimum engagement time is inconsistent with completion percentage requirement",
      )
    })
  })

  describe("trackMediaEvent", () => {
    it("should unlock capsule when engagement requirements are met", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret content",
        userId: "user123",
        mediaUrl: "https://example.com/video.mp4",
        mediaTitle: "Test Video",
        mediaType: MediaType.VIDEO,
        mediaDurationSeconds: 1000,
        minimumEngagementSeconds: 600,
        minimumCompletionPercentage: 0.8,
        unlocked: false,
        totalEngagementSeconds: 0,
        completionPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mediaEventDto: MediaEventDto = {
        sessionId: "session123",
        eventType: MediaEventType.COMPLETE,
        currentTime: 1000,
        duration: 1000,
      }

      const analysisResult = {
        totalPlayTime: 800, // 13+ minutes
        totalPauseTime: 50,
        completionPercentage: 1.0, // 100%
        requirementsMet: true,
        maxPositionReached: 1000,
        isValidEngagement: true,
      }

      mockRepository.findOne.mockResolvedValue(capsule)
      mockMediaEngagementService.trackMediaEvent.mockResolvedValue({})
      mockMediaEngagementService.analyzeEngagement.mockResolvedValue(analysisResult)
      mockRepository.save.mockResolvedValue({ ...capsule, unlocked: true, unlockedAt: new Date() })

      const result = await service.trackMediaEvent("capsule123", mediaEventDto, "user123")

      expect(result.unlocked).toBe(true)
      expect(result.content).toBe("Secret content")
      expect(result.progress.requirementsMet).toBe(true)
      expect(result.progress.totalEngagementSeconds).toBe(800)
      expect(result.progress.completionPercentage).toBe(1.0)

      expect(mockMediaEngagementService.trackMediaEvent).toHaveBeenCalledWith(
        capsule.id,
        "user123",
        mediaEventDto,
        capsule,
      )
    })

    it("should keep capsule locked when requirements are not met", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret content",
        userId: "user123",
        mediaUrl: "https://example.com/video.mp4",
        mediaTitle: "Test Video",
        mediaType: MediaType.VIDEO,
        mediaDurationSeconds: 1000,
        minimumEngagementSeconds: 600,
        minimumCompletionPercentage: 0.8,
        unlocked: false,
        totalEngagementSeconds: 0,
        completionPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mediaEventDto: MediaEventDto = {
        sessionId: "session123",
        eventType: MediaEventType.PAUSE,
        currentTime: 300,
        duration: 1000,
      }

      const analysisResult = {
        totalPlayTime: 200, // Only 3+ minutes
        totalPauseTime: 100,
        completionPercentage: 0.3, // Only 30%
        requirementsMet: false,
        maxPositionReached: 300,
        isValidEngagement: true,
      }

      mockRepository.findOne.mockResolvedValue(capsule)
      mockMediaEngagementService.trackMediaEvent.mockResolvedValue({})
      mockMediaEngagementService.analyzeEngagement.mockResolvedValue(analysisResult)
      mockRepository.save.mockResolvedValue(capsule)

      const result = await service.trackMediaEvent("capsule123", mediaEventDto, "user123")

      expect(result.unlocked).toBe(false)
      expect(result.content).toBeUndefined()
      expect(result.progress.requirementsMet).toBe(false)
      expect(result.progress.remainingSeconds).toBe(400) // 600 - 200
      expect(result.progress.remainingPercentage).toBe(0.5) // 0.8 - 0.3
    })

    it("should not unlock if engagement is invalid (gaming detected)", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret content",
        userId: "user123",
        mediaUrl: "https://example.com/video.mp4",
        mediaTitle: "Test Video",
        mediaType: MediaType.VIDEO,
        mediaDurationSeconds: 1000,
        minimumEngagementSeconds: 600,
        minimumCompletionPercentage: 0.8,
        unlocked: false,
        totalEngagementSeconds: 0,
        completionPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mediaEventDto: MediaEventDto = {
        sessionId: "session123",
        eventType: MediaEventType.COMPLETE,
        currentTime: 1000,
        duration: 1000,
      }

      const analysisResult = {
        totalPlayTime: 800,
        totalPauseTime: 50,
        completionPercentage: 1.0,
        requirementsMet: true,
        maxPositionReached: 1000,
        isValidEngagement: false, // Gaming detected!
      }

      mockRepository.findOne.mockResolvedValue(capsule)
      mockMediaEngagementService.trackMediaEvent.mockResolvedValue({})
      mockMediaEngagementService.analyzeEngagement.mockResolvedValue(analysisResult)
      mockRepository.save.mockResolvedValue(capsule)

      const result = await service.trackMediaEvent("capsule123", mediaEventDto, "user123")

      expect(result.unlocked).toBe(false)
      expect(result.content).toBeUndefined()
      expect(result.progress.requirementsMet).toBe(false) // False due to invalid engagement
    })

    it("should throw error if capsule not found", async () => {
      mockRepository.findOne.mockResolvedValue(null)

      await expect(
        service.trackMediaEvent("nonexistent", { sessionId: "test" } as MediaEventDto, "user123"),
      ).rejects.toThrow(NotFoundException)
    })

    it("should throw error if user doesn't own the capsule", async () => {
      const capsule = {
        id: "capsule123",
        userId: "user123",
        unlocked: false,
      }

      mockRepository.findOne.mockResolvedValue(capsule)

      await expect(
        service.trackMediaEvent("capsule123", { sessionId: "test" } as MediaEventDto, "different-user"),
      ).rejects.toThrow("You don't have permission to access this capsule")
    })
  })

  describe("startMediaSession", () => {
    it("should start a new media session", async () => {
      const capsule = {
        id: "capsule123",
        userId: "user123",
        unlocked: false,
      }

      const session = {
        id: "session123",
        capsuleId: "capsule123",
        userId: "user123",
        active: true,
      }

      mockRepository.findOne.mockResolvedValue(capsule)
      mockMediaEngagementService.startSession.mockResolvedValue(session)

      const result = await service.startMediaSession("capsule123", {}, "user123")

      expect(result.sessionId).toBe("session123")
      expect(mockMediaEngagementService.startSession).toHaveBeenCalledWith(
        "capsule123",
        "user123",
        undefined,
        undefined,
      )
    })
  })
})
