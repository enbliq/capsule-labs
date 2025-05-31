import { Test, type TestingModule } from "@nestjs/testing"
import { HeartbeatCapsuleController } from "../heartbeat-capsule.controller"
import { HeartbeatCapsuleService } from "../heartbeat-capsule.service"
import type { CreateHeartbeatCapsuleDto } from "../dto/create-heartbeat-capsule.dto"
import type { SubmitBpmDto } from "../dto/submit-bpm.dto"
import type { ViewHeartbeatCapsuleDto } from "../dto/view-heartbeat-capsule.dto"

describe("HeartbeatCapsuleController", () => {
  let controller: HeartbeatCapsuleController
  let service: HeartbeatCapsuleService

  const mockHeartbeatCapsuleService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    unlockCapsule: jest.fn(),
    getSubmissionHistory: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeartbeatCapsuleController],
      providers: [
        {
          provide: HeartbeatCapsuleService,
          useValue: mockHeartbeatCapsuleService,
        },
      ],
    }).compile()

    controller = module.get<HeartbeatCapsuleController>(HeartbeatCapsuleController)
    service = module.get<HeartbeatCapsuleService>(HeartbeatCapsuleService)
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
  })

  describe("create", () => {
    it("should create a heartbeat capsule", async () => {
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

      mockHeartbeatCapsuleService.create.mockResolvedValue(capsule)

      const result = await controller.create(createDto, { user: { id: userId } })

      expect(service.create).toHaveBeenCalledWith(createDto, userId)
      expect(result).toEqual({
        id: capsule.id,
        title: capsule.title,
        isLocked: true,
        targetMinBpm: capsule.targetMinBpm,
        targetMaxBpm: capsule.targetMaxBpm,
        createdAt: capsule.createdAt,
        updatedAt: capsule.updatedAt,
      })
    })
  })

  describe("unlockCapsule", () => {
    it("should try to unlock a capsule with BPM", async () => {
      const submitBpmDto: SubmitBpmDto = {
        bpm: 70,
      }

      const userId = "user123"

      const viewDto: ViewHeartbeatCapsuleDto = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        isLocked: false,
        targetMinBpm: 60,
        targetMaxBpm: 80,
        submittedBpm: 70,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockHeartbeatCapsuleService.unlockCapsule.mockResolvedValue(viewDto)

      const result = await controller.unlockCapsule("capsule123", submitBpmDto, { user: { id: userId } })

      expect(service.unlockCapsule).toHaveBeenCalledWith("capsule123", submitBpmDto, userId)
      expect(result).toEqual(viewDto)
    })
  })

  describe("findAll", () => {
    it("should return all heartbeat capsules for the user", async () => {
      const userId = "user123"

      const capsules = [
        {
          id: "capsule123",
          title: "Test Capsule 1",
          content: "Secret Content 1",
          userId,
          targetMinBpm: 60,
          targetMaxBpm: 80,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "capsule456",
          title: "Test Capsule 2",
          content: "Secret Content 2",
          userId,
          targetMinBpm: 70,
          targetMaxBpm: 90,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockHeartbeatCapsuleService.findAll.mockResolvedValue(capsules)

      const result = await controller.findAll({ user: { id: userId } })

      expect(service.findAll).toHaveBeenCalledWith(userId)
      expect(result).toEqual([
        {
          id: "capsule123",
          title: "Test Capsule 1",
          isLocked: true,
          targetMinBpm: 60,
          targetMaxBpm: 80,
          createdAt: capsules[0].createdAt,
          updatedAt: capsules[0].updatedAt,
        },
        {
          id: "capsule456",
          title: "Test Capsule 2",
          isLocked: true,
          targetMinBpm: 70,
          targetMaxBpm: 90,
          createdAt: capsules[1].createdAt,
          updatedAt: capsules[1].updatedAt,
        },
      ])
    })
  })
})
