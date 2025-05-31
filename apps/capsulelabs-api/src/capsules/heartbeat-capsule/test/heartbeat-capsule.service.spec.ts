import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { HeartbeatCapsuleService } from "../heartbeat-capsule.service"
import { HeartbeatCapsule } from "../entities/heartbeat-capsule.entity"
import { BpmSubmission } from "../entities/bpm-submission.entity"
import type { CreateHeartbeatCapsuleDto } from "../dto/create-heartbeat-capsule.dto"
import type { SubmitBpmDto } from "../dto/submit-bpm.dto"
import { NotFoundException } from "@nestjs/common"

describe("HeartbeatCapsuleService", () => {
  let service: HeartbeatCapsuleService
  let capsuleRepository: Repository<HeartbeatCapsule>
  let submissionRepository: Repository<BpmSubmission>

  const mockCapsuleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }

  const mockSubmissionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeartbeatCapsuleService,
        {
          provide: getRepositoryToken(HeartbeatCapsule),
          useValue: mockCapsuleRepository,
        },
        {
          provide: getRepositoryToken(BpmSubmission),
          useValue: mockSubmissionRepository,
        },
      ],
    }).compile()

    service = module.get<HeartbeatCapsuleService>(HeartbeatCapsuleService)
    capsuleRepository = module.get<Repository<HeartbeatCapsule>>(getRepositoryToken(HeartbeatCapsule))
    submissionRepository = module.get<Repository<BpmSubmission>>(getRepositoryToken(BpmSubmission))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("create", () => {
    it("should create a new heartbeat capsule", async () => {
      const createDto: CreateHeartbeatCapsuleDto = {
        title: "Test Capsule",
        content: "Test Content",
        targetMinBpm: 60,
        targetMaxBpm: 80,
      }

      const userId = "user123"

      const capsule = {
        id: "capsule123",
        ...createDto,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockCapsuleRepository.create.mockReturnValue(capsule)
      mockCapsuleRepository.save.mockResolvedValue(capsule)

      const result = await service.create(createDto, userId)

      expect(mockCapsuleRepository.create).toHaveBeenCalledWith({
        ...createDto,
        userId,
      })
      expect(mockCapsuleRepository.save).toHaveBeenCalledWith(capsule)
      expect(result).toEqual(capsule)
    })

    it("should throw an error if min BPM is greater than max BPM", async () => {
      const createDto: CreateHeartbeatCapsuleDto = {
        title: "Test Capsule",
        content: "Test Content",
        targetMinBpm: 90,
        targetMaxBpm: 80,
      }

      const userId = "user123"

      await expect(service.create(createDto, userId)).rejects.toThrow(
        "Minimum BPM must be less than or equal to maximum BPM",
      )
    })
  })

  describe("unlockCapsule", () => {
    it("should unlock capsule when BPM is within range", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        targetMinBpm: 60,
        targetMaxBpm: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const submitBpmDto: SubmitBpmDto = {
        bpm: 70,
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)
      mockSubmissionRepository.create.mockReturnValue({
        capsuleId: capsule.id,
        userId: capsule.userId,
        bpm: submitBpmDto.bpm,
        successful: true,
      })
      mockSubmissionRepository.save.mockResolvedValue({})

      const result = await service.unlockCapsule("capsule123", submitBpmDto, "user123")

      expect(result.isLocked).toBe(false)
      expect(result.content).toBe("Secret Content")
      expect(result.submittedBpm).toBe(70)
      expect(mockSubmissionRepository.create).toHaveBeenCalledWith({
        capsuleId: capsule.id,
        userId: capsule.userId,
        bpm: submitBpmDto.bpm,
        successful: true,
      })
    })

    it("should keep capsule locked when BPM is below range", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        targetMinBpm: 60,
        targetMaxBpm: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const submitBpmDto: SubmitBpmDto = {
        bpm: 50,
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)
      mockSubmissionRepository.create.mockReturnValue({
        capsuleId: capsule.id,
        userId: capsule.userId,
        bpm: submitBpmDto.bpm,
        successful: false,
      })
      mockSubmissionRepository.save.mockResolvedValue({})

      const result = await service.unlockCapsule("capsule123", submitBpmDto, "user123")

      expect(result.isLocked).toBe(true)
      expect(result.content).toBeUndefined()
      expect(result.submittedBpm).toBe(50)
      expect(mockSubmissionRepository.create).toHaveBeenCalledWith({
        capsuleId: capsule.id,
        userId: capsule.userId,
        bpm: submitBpmDto.bpm,
        successful: false,
      })
    })

    it("should keep capsule locked when BPM is above range", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        targetMinBpm: 60,
        targetMaxBpm: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const submitBpmDto: SubmitBpmDto = {
        bpm: 90,
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)
      mockSubmissionRepository.create.mockReturnValue({
        capsuleId: capsule.id,
        userId: capsule.userId,
        bpm: submitBpmDto.bpm,
        successful: false,
      })
      mockSubmissionRepository.save.mockResolvedValue({})

      const result = await service.unlockCapsule("capsule123", submitBpmDto, "user123")

      expect(result.isLocked).toBe(true)
      expect(result.content).toBeUndefined()
      expect(result.submittedBpm).toBe(90)
    })

    it("should throw an error if capsule not found", async () => {
      mockCapsuleRepository.findOne.mockResolvedValue(null)

      await expect(service.unlockCapsule("nonexistent", { bpm: 70 }, "user123")).rejects.toThrow(NotFoundException)
    })

    it("should throw an error if user doesn't own the capsule", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        targetMinBpm: 60,
        targetMaxBpm: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)

      await expect(service.unlockCapsule("capsule123", { bpm: 70 }, "different-user")).rejects.toThrow(
        "You don't have permission to access this capsule",
      )
    })
  })
})
