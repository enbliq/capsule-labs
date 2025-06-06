import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { NotFoundException, ConflictException } from "@nestjs/common"
import { CountdownCapsuleService } from "./countdown-capsule.service"
import { CountdownCapsule } from "./entities/countdown-capsule.entity"
import type { CreateCountdownCapsuleDto } from "./dto/create-countdown-capsule.dto"
import type { StartCountdownDto } from "./dto/start-countdown.dto"

describe("CountdownCapsuleService", () => {
  let service: CountdownCapsuleService
  let repository: Repository<CountdownCapsule>

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountdownCapsuleService,
        {
          provide: getRepositoryToken(CountdownCapsule),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<CountdownCapsuleService>(CountdownCapsuleService)
    repository = module.get<Repository<CountdownCapsule>>(getRepositoryToken(CountdownCapsule))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("create", () => {
    it("should create a countdown capsule successfully", async () => {
      const createDto: CreateCountdownCapsuleDto = {
        title: "Test Capsule",
        content: "Secret content",
        durationMinutes: 60,
        createdBy: "user123",
      }

      const mockCapsule = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        started: false,
        unlocked: false,
        unlockAt: null,
        isExpired: false,
        remainingTime: 3600000,
      }

      mockRepository.create.mockReturnValue(mockCapsule)
      mockRepository.save.mockResolvedValue(mockCapsule)

      const result = await service.create(createDto)

      expect(mockRepository.create).toHaveBeenCalledWith(createDto)
      expect(mockRepository.save).toHaveBeenCalledWith(mockCapsule)
      expect(result.title).toBe(createDto.title)
      expect(result.started).toBe(false)
    })
  })

  describe("start", () => {
    it("should start countdown successfully", async () => {
      const startDto: StartCountdownDto = {
        capsuleId: "123e4567-e89b-12d3-a456-426614174000",
      }

      const mockCapsule = {
        id: startDto.capsuleId,
        title: "Test Capsule",
        content: "Secret content",
        durationMinutes: 60,
        started: false,
        unlocked: false,
        unlockAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user123",
        isExpired: false,
        remainingTime: 3600000,
      }

      const updatedCapsule = {
        ...mockCapsule,
        started: true,
        unlockAt: new Date(Date.now() + 60 * 60 * 1000),
      }

      mockRepository.findOne.mockResolvedValue(mockCapsule)
      mockRepository.save.mockResolvedValue(updatedCapsule)

      const result = await service.start(startDto)

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: startDto.capsuleId },
      })
      expect(result.started).toBe(true)
      expect(result.unlockAt).toBeDefined()
    })

    it("should throw NotFoundException when capsule not found", async () => {
      const startDto: StartCountdownDto = {
        capsuleId: "non-existent-id",
      }

      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.start(startDto)).rejects.toThrow(NotFoundException)
    })

    it("should throw ConflictException when capsule already started", async () => {
      const startDto: StartCountdownDto = {
        capsuleId: "123e4567-e89b-12d3-a456-426614174000",
      }

      const mockCapsule = {
        id: startDto.capsuleId,
        started: true,
        unlockAt: new Date(),
      }

      mockRepository.findOne.mockResolvedValue(mockCapsule)

      await expect(service.start(startDto)).rejects.toThrow(ConflictException)
    })
  })

  describe("view", () => {
    it("should return capsule when not expired", async () => {
      const capsuleId = "123e4567-e89b-12d3-a456-426614174000"
      const futureDate = new Date(Date.now() + 60 * 60 * 1000)

      const mockCapsule = {
        id: capsuleId,
        title: "Test Capsule",
        content: "Secret content",
        durationMinutes: 60,
        started: true,
        unlocked: false,
        unlockAt: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user123",
        get isExpired() {
          return false
        },
        get remainingTime() {
          return 3600000
        },
      }

      mockRepository.findOne.mockResolvedValue(mockCapsule)

      const result = await service.view(capsuleId)

      expect(result.content).toBeUndefined() // Content should be hidden
      expect(result.unlocked).toBe(false)
    })

    it("should unlock capsule when expired", async () => {
      const capsuleId = "123e4567-e89b-12d3-a456-426614174000"
      const pastDate = new Date(Date.now() - 60 * 60 * 1000)

      const mockCapsule = {
        id: capsuleId,
        title: "Test Capsule",
        content: "Secret content",
        durationMinutes: 60,
        started: true,
        unlocked: false,
        unlockAt: pastDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user123",
        get isExpired() {
          return true
        },
        get remainingTime() {
          return 0
        },
      }

      const unlockedCapsule = { ...mockCapsule, unlocked: true }

      mockRepository.findOne.mockResolvedValue(mockCapsule)
      mockRepository.save.mockResolvedValue(unlockedCapsule)

      const result = await service.view(capsuleId)

      expect(mockRepository.save).toHaveBeenCalled()
      expect(result.content).toBe("Secret content") // Content should be revealed
      expect(result.unlocked).toBe(true)
    })

    it("should throw NotFoundException when capsule not found", async () => {
      const capsuleId = "non-existent-id"

      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.view(capsuleId)).rejects.toThrow(NotFoundException)
    })
  })

  describe("time comparisons", () => {
    it("should correctly identify expired capsules", async () => {
      const capsuleId = "123e4567-e89b-12d3-a456-426614174000"
      const pastDate = new Date(Date.now() - 1000) // 1 second ago

      const mockCapsule = {
        id: capsuleId,
        started: true,
        unlockAt: pastDate,
        get isExpired() {
          return new Date() >= this.unlockAt
        },
        get remainingTime() {
          const remaining = this.unlockAt.getTime() - new Date().getTime()
          return Math.max(0, remaining)
        },
      }

      expect(mockCapsule.isExpired).toBe(true)
      expect(mockCapsule.remainingTime).toBe(0)
    })

    it("should correctly calculate remaining time for active capsules", async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

      const mockCapsule = {
        started: true,
        unlockAt: futureDate,
        durationMinutes: 60,
        get isExpired() {
          return new Date() >= this.unlockAt
        },
        get remainingTime() {
          const remaining = this.unlockAt.getTime() - new Date().getTime()
          return Math.max(0, remaining)
        },
      }

      expect(mockCapsule.isExpired).toBe(false)
      expect(mockCapsule.remainingTime).toBeGreaterThan(0)
      expect(mockCapsule.remainingTime).toBeLessThanOrEqual(60 * 60 * 1000)
    })
  })
})
