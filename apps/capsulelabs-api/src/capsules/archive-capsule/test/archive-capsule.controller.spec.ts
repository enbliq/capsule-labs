import { Test, type TestingModule } from "@nestjs/testing"
import { ArchiveCapsuleController } from "../archive-capsule.controller"
import { ArchiveCapsuleService } from "../archive-capsule.service"
import type { CreateArchiveCapsuleDto } from "../dto/create-archive-capsule.dto"
import type { MediaEventDto } from "../dto/media-event.dto"
import type { ViewArchiveCapsuleDto } from "../dto/view-archive-capsule.dto"
import { MediaType } from "../entities/archive-capsule.entity"
import { MediaEventType } from "../entities/media-engagement.entity"

describe("ArchiveCapsuleController", () => {
  let controller: ArchiveCapsuleController
  let service: ArchiveCapsuleService

  const mockArchiveCapsuleService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getCapsuleStatus: jest.fn(),
    startMediaSession: jest.fn(),
    endMediaSession: jest.fn(),
    trackMediaEvent: jest.fn(),
    getEngagementHistory: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArchiveCapsuleController],
      providers: [
        {
          provide: ArchiveCapsuleService,
          useValue: mockArchiveCapsuleService,
        },
      ],
    }).compile()

    controller = module.get<ArchiveCapsuleController>(ArchiveCapsuleController)
    service = module.get<ArchiveCapsuleService>(ArchiveCapsuleService)
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
  })

  describe("create", () => {
    it("should create an archive capsule", async () => {
      const createDto: CreateArchiveCapsuleDto = {
        title: "Educational Video",
        content: "Learning materials",
        mediaUrl: "https://example.com/video.mp4",
        mediaTitle: "Science Documentary",
        mediaType: MediaType.VIDEO,
        mediaDurationSeconds: 2400, // 40 minutes
        minimumEngagementSeconds: 1800, // 30 minutes
        minimumCompletionPercentage: 0.9,
        requireFullCompletion: false,
        allowPausing: true,
        maxPauseTimeSeconds: 180,
      }

      const userId = "user123"

      const capsule = {
        id: "capsule123",
        ...createDto,
        userId,
        unlocked: false,
        totalEngagementSeconds: 0,
        completionPercentage: 0,
        unlockedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockArchiveCapsuleService.create.mockResolvedValue(capsule)

      const result = await controller.create(createDto, { user: { id: userId } })

      expect(mockArchiveCapsuleService.create).toHaveBeenCalledWith(createDto, userId)
      expect(result).toEqual({
        id: capsule.id,
        title: capsule.title,
        unlocked: capsule.unlocked,
        mediaUrl: capsule.mediaUrl,
        mediaTitle: capsule.mediaTitle,
        requirements: {
          mediaType: capsule.mediaType,
          mediaDurationSeconds: capsule.mediaDurationSeconds,
          minimumEngagementSeconds: capsule.minimumEngagementSeconds,
          minimumCompletionPercentage: capsule.minimumCompletionPercentage,
          requireFullCompletion: capsule.requireFullCompletion,
          allowPausing: capsule.allowPausing,
          maxPauseTimeSeconds: capsule.maxPauseTimeSeconds,
        },
        progress: {
          totalEngagementSeconds: 0,
          completionPercentage: 0,
          requirementsMet: false,
          remainingSeconds: capsule.minimumEngagementSeconds,
          remainingPercentage: capsule.minimumCompletionPercentage,
        },
        unlockedAt: capsule.unlockedAt,
        createdAt: capsule.createdAt,
        updatedAt: capsule.updatedAt,
      })
    })
  })

  describe("trackEvent", () => {
    it("should track media event and return updated status", async () => {
      const mediaEventDto: MediaEventDto = {
        sessionId: "session123",
        eventType: MediaEventType.PLAY,
        currentTime: 300,
        duration: 2400,
        playbackRate: 1.0,
        volume: 0.8,
      }

      const userId = "user123"

      const viewDto: ViewArchiveCapsuleDto = {
        id: "capsule123",
        title: "Educational Video",
        unlocked: false,
        mediaUrl: "https://example.com/video.mp4",
        mediaTitle: "Science Documentary",
        requirements: {
          mediaType: MediaType.VIDEO,
          mediaDurationSeconds: 2400,
          minimumEngagementSeconds: 1800,
          minimumCompletionPercentage: 0.9,
          requireFullCompletion: false,
          allowPausing: true,
          maxPauseTimeSeconds: 180,
        },
        progress: {
          totalEngagementSeconds: 300,
          completionPercentage: 0.125, // 300/2400
          requirementsMet: false,
          remainingSeconds: 1500, // 1800 - 300
          remainingPercentage: 0.775, // 0.9 - 0.125
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockArchiveCapsuleService.trackMediaEvent.mockResolvedValue(viewDto)

      const result = await controller.trackEvent("capsule123", mediaEventDto, { user: { id: userId } })

      expect(mockArchiveCapsuleService.trackMediaEvent).toHaveBeenCalledWith("capsule123", mediaEventDto, userId)
      expect(result).toEqual(viewDto)
    })
  })

  describe("startSession", () => {
    it("should start a media session", async () => {
      const startSessionDto = {
        userAgent: "Mozilla/5.0...",
        ipAddress: "192.168.1.1",
      }

      const userId = "user123"
      const sessionResponse = { sessionId: "session123" }

      mockArchiveCapsuleService.startMediaSession.mockResolvedValue(sessionResponse)

      const result = await controller.startSession("capsule123", startSessionDto, { user: { id: userId } })

      expect(mockArchiveCapsuleService.startMediaSession).toHaveBeenCalledWith("capsule123", startSessionDto, userId)
      expect(result).toEqual(sessionResponse)
    })
  })

  describe("endSession", () => {
    it("should end a media session", async () => {
      const userId = "user123"

      mockArchiveCapsuleService.endMediaSession.mockResolvedValue(undefined)

      const result = await controller.endSession("capsule123", "session123", { user: { id: userId } })

      expect(mockArchiveCapsuleService.endMediaSession).toHaveBeenCalledWith("capsule123", "session123", userId)
      expect(result).toEqual({ message: "Session ended successfully" })
    })
  })

  describe("findAll", () => {
    it("should return all archive capsules for the user", async () => {
      const userId = "user123"

      const capsules = [
        {
          id: "capsule123",
          title: "Video Capsule",
          content: "Video content",
          userId,
          mediaUrl: "https://example.com/video1.mp4",
          mediaTitle: "Video 1",
          mediaType: MediaType.VIDEO,
          mediaDurationSeconds: 1800,
          minimumEngagementSeconds: 1200,
          minimumCompletionPercentage: 0.8,
          requireFullCompletion: false,
          allowPausing: true,
          maxPauseTimeSeconds: 120,
          unlocked: false,
          totalEngagementSeconds: 600,
          completionPercentage: 0.4,
          unlockedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "capsule456",
          title: "Audio Capsule",
          content: "Audio content",
          userId,
          mediaUrl: "https://example.com/audio1.mp3",
          mediaTitle: "Podcast Episode",
          mediaType: MediaType.AUDIO,
          mediaDurationSeconds: 3600,
          minimumEngagementSeconds: 2700,
          minimumCompletionPercentage: 0.9,
          requireFullCompletion: true,
          allowPausing: false,
          maxPauseTimeSeconds: 0,
          unlocked: true,
          totalEngagementSeconds: 3600,
          completionPercentage: 1.0,
          unlockedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockArchiveCapsuleService.findAll.mockResolvedValue(capsules)

      const result = await controller.findAll({ user: { id: userId } })

      expect(mockArchiveCapsuleService.findAll).toHaveBeenCalledWith(userId)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: "capsule123",
        title: "Video Capsule",
        unlocked: false,
        mediaUrl: "https://example.com/video1.mp4",
        mediaTitle: "Video 1",
        requirements: {
          mediaType: MediaType.VIDEO,
          mediaDurationSeconds: 1800,
          minimumEngagementSeconds: 1200,
          minimumCompletionPercentage: 0.8,
          requireFullCompletion: false,
          allowPausing: true,
          maxPauseTimeSeconds: 120,
        },
        progress: {
          totalEngagementSeconds: 600,
          completionPercentage: 0.4,
          requirementsMet: false,
          remainingSeconds: 600, // 1200 - 600
          remainingPercentage: 0.4, // 0.8 - 0.4
        },
        unlockedAt: null,
        createdAt: capsules[0].createdAt,
        updatedAt: capsules[0].updatedAt,
      })
      expect(result[1]).toEqual({
        id: "capsule456",
        title: "Audio Capsule",
        unlocked: true,
        mediaUrl: "https://example.com/audio1.mp3",
        mediaTitle: "Podcast Episode",
        requirements: {
          mediaType: MediaType.AUDIO,
          mediaDurationSeconds: 3600,
          minimumEngagementSeconds: 2700,
          minimumCompletionPercentage: 0.9,
          requireFullCompletion: true,
          allowPausing: false,
          maxPauseTimeSeconds: 0,
        },
        progress: {
          totalEngagementSeconds: 3600,
          completionPercentage: 1.0,
          requirementsMet: true,
          remainingSeconds: 0,
          remainingPercentage: 0,
        },
        unlockedAt: capsules[1].unlockedAt,
        createdAt: capsules[1].createdAt,
        updatedAt: capsules[1].updatedAt,
      })
    })
  })

  describe("getCapsuleStatus", () => {
    it("should return current capsule status with progress", async () => {
      const userId = "user123"

      const viewDto: ViewArchiveCapsuleDto = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Unlocked content",
        unlocked: true,
        mediaUrl: "https://example.com/video.mp4",
        mediaTitle: "Test Video",
        requirements: {
          mediaType: MediaType.VIDEO,
          mediaDurationSeconds: 1800,
          minimumEngagementSeconds: 1200,
          minimumCompletionPercentage: 0.8,
          requireFullCompletion: false,
          allowPausing: true,
          maxPauseTimeSeconds: 120,
        },
        progress: {
          totalEngagementSeconds: 1500,
          completionPercentage: 0.9,
          requirementsMet: true,
          remainingSeconds: 0,
          remainingPercentage: 0,
        },
        unlockedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockArchiveCapsuleService.getCapsuleStatus.mockResolvedValue(viewDto)

      const result = await controller.getCapsuleStatus("capsule123", { user: { id: userId } })

      expect(mockArchiveCapsuleService.getCapsuleStatus).toHaveBeenCalledWith("capsule123", userId)
      expect(result).toEqual(viewDto)
    })
  })
})
