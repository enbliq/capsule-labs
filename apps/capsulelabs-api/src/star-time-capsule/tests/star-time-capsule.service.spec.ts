import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { StarTimeCapsuleService } from "../services/star-time-capsule.service"
import { AstronomyService } from "../services/astronomy.service"
import { StarTimeCapsule } from "../entities/star-time-capsule.entity"
import { AstronomicalEventType } from "../enums/astronomical-event.enum"
import { NotFoundException } from "@nestjs/common"

describe("StarTimeCapsuleService", () => {
  let service: StarTimeCapsuleService
  let repository: Repository<StarTimeCapsule>
  let astronomyService: AstronomyService

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  }

  const mockAstronomyService = {
    isEventOccurring: jest.fn(),
    getUpcomingEvents: jest.fn(),
    getNextEventDate: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StarTimeCapsuleService,
        {
          provide: getRepositoryToken(StarTimeCapsule),
          useValue: mockRepository,
        },
        {
          provide: AstronomyService,
          useValue: mockAstronomyService,
        },
      ],
    }).compile()

    service = module.get<StarTimeCapsuleService>(StarTimeCapsuleService)
    repository = module.get<Repository<StarTimeCapsule>>(getRepositoryToken(StarTimeCapsule))
    astronomyService = module.get<AstronomyService>(AstronomyService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("create", () => {
    it("should create a new star time capsule", async () => {
      const createDto = {
        eventType: AstronomicalEventType.FULL_MOON,
        expectedDate: "2024-12-15T02:30:00Z",
        title: "Test Capsule",
        content: "Test content",
        createdBy: "testuser",
      }

      const expectedCapsule = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        eventType: AstronomicalEventType.FULL_MOON,
        expectedDate: new Date("2024-12-15T02:30:00Z"),
        title: "Test Capsule",
        content: "Test content",
        createdBy: "testuser",
        unlocked: false,
        unlockedAt: null,
      }

      mockRepository.create.mockReturnValue(expectedCapsule)
      mockRepository.save.mockResolvedValue(expectedCapsule)

      const result = await service.create(createDto)

      expect(mockRepository.create).toHaveBeenCalledWith({
        eventType: AstronomicalEventType.FULL_MOON,
        expectedDate: new Date("2024-12-15T02:30:00Z"),
        title: "Test Capsule",
        content: "Test content",
        createdBy: "testuser",
        unlocked: false,
        unlockedAt: null,
      })
      expect(mockRepository.save).toHaveBeenCalledWith(expectedCapsule)
      expect(result).toEqual(expectedCapsule)
    })

    it("should throw error for past expected date", async () => {
      const createDto = {
        eventType: AstronomicalEventType.FULL_MOON,
        expectedDate: "2020-01-01T00:00:00Z", // Past date
        title: "Test Capsule",
      }

      await expect(service.create(createDto)).rejects.toThrow("Expected date must be in the future")
    })
  })

  describe("checkUnlock", () => {
    it("should unlock capsule when event is occurring", async () => {
      const capsule = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        eventType: AstronomicalEventType.FULL_MOON,
        expectedDate: new Date(),
        unlocked: false,
        unlockedAt: null,
      }

      mockRepository.find.mockResolvedValue([capsule])
      mockAstronomyService.isEventOccurring.mockReturnValue(true)
      mockRepository.save.mockResolvedValue({
        ...capsule,
        unlocked: true,
        unlockedAt: new Date(),
      })

      const result = await service.checkUnlock({})

      expect(result.totalChecked).toBe(1)
      expect(result.newlyUnlocked).toBe(1)
      expect(result.results[0].unlocked).toBe(true)
      expect(mockRepository.save).toHaveBeenCalled()
    })

    it("should not unlock capsule when event is not occurring", async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      const capsule = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        eventType: AstronomicalEventType.FULL_MOON,
        expectedDate: futureDate,
        unlocked: false,
        unlockedAt: null,
      }

      mockRepository.find.mockResolvedValue([capsule])
      mockAstronomyService.isEventOccurring.mockReturnValue(false)

      const result = await service.checkUnlock({})

      expect(result.totalChecked).toBe(1)
      expect(result.newlyUnlocked).toBe(0)
      expect(result.results[0].unlocked).toBe(false)
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it("should throw NotFoundException for invalid capsule ID", async () => {
      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.checkUnlock({ capsuleId: "invalid-id" })).rejects.toThrow(NotFoundException)
    })
  })

  describe("findOne", () => {
    it("should return capsule when found", async () => {
      const capsule = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        eventType: AstronomicalEventType.FULL_MOON,
        expectedDate: new Date(),
        unlocked: false,
      }

      mockRepository.findOne.mockResolvedValue(capsule)

      const result = await service.findOne("123e4567-e89b-12d3-a456-426614174000")

      expect(result).toEqual(capsule)
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: "123e4567-e89b-12d3-a456-426614174000" },
      })
    })

    it("should throw NotFoundException when capsule not found", async () => {
      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.findOne("invalid-id")).rejects.toThrow(NotFoundException)
    })
  })

  describe("suggestNextEventDate", () => {
    it("should return suggested date for valid event type", async () => {
      const nextDate = new Date("2024-12-15T02:30:00Z")
      mockAstronomyService.getNextEventDate.mockResolvedValue(nextDate)

      const result = await service.suggestNextEventDate(AstronomicalEventType.FULL_MOON)

      expect(result.eventType).toBe(AstronomicalEventType.FULL_MOON)
      expect(result.suggestedDate).toEqual(nextDate)
      expect(result.message).toContain("Next full_moon is expected")
    })

    it("should throw error for calculation failure", async () => {
      mockAstronomyService.getNextEventDate.mockRejectedValue(new Error("Calculation failed"))

      await expect(service.suggestNextEventDate(AstronomicalEventType.FULL_MOON)).rejects.toThrow(
        "Unable to calculate next full_moon date",
      )
    })
  })
})
