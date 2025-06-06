import { Test, type TestingModule } from "@nestjs/testing"
import { CountdownCapsuleController } from "./countdown-capsule.controller"
import { CountdownCapsuleService } from "./countdown-capsule.service"
import type { CreateCountdownCapsuleDto } from "./dto/create-countdown-capsule.dto"
import type { StartCountdownDto } from "./dto/start-countdown.dto"
import { NotFoundException, ConflictException } from "@nestjs/common"

describe("CountdownCapsuleController", () => {
  let controller: CountdownCapsuleController
  let service: CountdownCapsuleService

  const mockService = {
    create: jest.fn(),
    start: jest.fn(),
    view: jest.fn(),
    findAll: jest.fn(),
    findByCreator: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CountdownCapsuleController],
      providers: [
        {
          provide: CountdownCapsuleService,
          useValue: mockService,
        },
      ],
    }).compile()

    controller = module.get<CountdownCapsuleController>(CountdownCapsuleController)
    service = module.get<CountdownCapsuleService>(CountdownCapsuleService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("create", () => {
    it("should create a countdown capsule", async () => {
      const createDto: CreateCountdownCapsuleDto = {
        title: "Test Capsule",
        content: "Secret content",
        durationMinutes: 60,
        createdBy: "user123",
      }

      const expectedResult = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        ...createDto,
        createdAt: new Date(),
        started: false,
        unlocked: false,
        isExpired: false,
        remainingTime: 3600000,
        unlockAt: undefined,
      }

      mockService.create.mockResolvedValue(expectedResult)

      const result = await controller.create(createDto)

      expect(service.create).toHaveBeenCalledWith(createDto)
      expect(result).toEqual(expectedResult)
    })
  })

  describe("start", () => {
    it("should start countdown successfully", async () => {
      const startDto: StartCountdownDto = {
        capsuleId: "123e4567-e89b-12d3-a456-426614174000",
      }

      const expectedResult = {
        id: startDto.capsuleId,
        title: "Test Capsule",
        started: true,
        unlockAt: new Date(Date.now() + 60 * 60 * 1000),
        unlocked: false,
        isExpired: false,
        remainingTime: 3600000,
      }

      mockService.start.mockResolvedValue(expectedResult)

      const result = await controller.start(startDto)

      expect(service.start).toHaveBeenCalledWith(startDto)
      expect(result).toEqual(expectedResult)
    })

    it("should handle not found error", async () => {
      const startDto: StartCountdownDto = {
        capsuleId: "non-existent-id",
      }

      mockService.start.mockRejectedValue(new NotFoundException())

      await expect(controller.start(startDto)).rejects.toThrow(NotFoundException)
    })

    it("should handle conflict error when already started", async () => {
      const startDto: StartCountdownDto = {
        capsuleId: "123e4567-e89b-12d3-a456-426614174000",
      }

      mockService.start.mockRejectedValue(new ConflictException())

      await expect(controller.start(startDto)).rejects.toThrow(ConflictException)
    })
  })

  describe("view", () => {
    it("should return capsule view", async () => {
      const capsuleId = "123e4567-e89b-12d3-a456-426614174000"
      const expectedResult = {
        id: capsuleId,
        title: "Test Capsule",
        started: true,
        unlocked: false,
        isExpired: false,
        remainingTime: 3600000,
      }

      mockService.view.mockResolvedValue(expectedResult)

      const result = await controller.view(capsuleId)

      expect(service.view).toHaveBeenCalledWith(capsuleId)
      expect(result).toEqual(expectedResult)
    })

    it("should handle not found error", async () => {
      const capsuleId = "non-existent-id"

      mockService.view.mockRejectedValue(new NotFoundException())

      await expect(controller.view(capsuleId)).rejects.toThrow(NotFoundException)
    })
  })

  describe("findAll", () => {
    it("should return all capsules when no filter", async () => {
      const expectedResult = [
        {
          id: "1",
          title: "Capsule 1",
          started: false,
          unlocked: false,
        },
        {
          id: "2",
          title: "Capsule 2",
          started: true,
          unlocked: true,
        },
      ]

      mockService.findAll.mockResolvedValue(expectedResult)

      const result = await controller.findAll()

      expect(service.findAll).toHaveBeenCalled()
      expect(result).toEqual(expectedResult)
    })

    it("should return filtered capsules by creator", async () => {
      const createdBy = "user123"
      const expectedResult = [
        {
          id: "1",
          title: "User Capsule",
          createdBy,
          started: false,
          unlocked: false,
        },
      ]

      mockService.findByCreator.mockResolvedValue(expectedResult)

      const result = await controller.findAll(createdBy)

      expect(service.findByCreator).toHaveBeenCalledWith(createdBy)
      expect(result).toEqual(expectedResult)
    })
  })
})
