import { Test, type TestingModule } from "@nestjs/testing"
import { DaylightCapsuleController } from "../daylight-capsule.controller"
import { DaylightCapsuleService } from "../daylight-capsule.service"
import type { CreateDaylightCapsuleDto } from "../dto/create-daylight-capsule.dto"
import type { ViewDaylightCapsuleDto } from "../dto/view-daylight-capsule.dto"

describe("DaylightCapsuleController", () => {
  let controller: DaylightCapsuleController
  let service: DaylightCapsuleService

  const mockDaylightCapsuleService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DaylightCapsuleController],
      providers: [
        {
          provide: DaylightCapsuleService,
          useValue: mockDaylightCapsuleService,
        },
      ],
    }).compile()

    controller = module.get<DaylightCapsuleController>(DaylightCapsuleController)
    service = module.get<DaylightCapsuleService>(DaylightCapsuleService)
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
  })

  describe("create", () => {
    it("should create a daylight capsule", async () => {
      const createDto: CreateDaylightCapsuleDto = {
        title: "Test Capsule",
        content: "Test Content",
        latitude: 40.7128,
        longitude: -74.006,
        timezone: "America/New_York",
      }

      const userId = "user123"

      const capsule = {
        id: "capsule123",
        ...createDto,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const viewDto: ViewDaylightCapsuleDto = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Test Content",
        isLocked: false,
        sunrise: new Date().toISOString(),
        sunset: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDaylightCapsuleService.create.mockResolvedValue(capsule)
      mockDaylightCapsuleService.findOne.mockResolvedValue(viewDto)

      const result = await controller.create(createDto, { user: { id: userId } })

      expect(service.create).toHaveBeenCalledWith(createDto, userId)
      expect(service.findOne).toHaveBeenCalledWith(capsule.id)
      expect(result).toEqual(viewDto)
    })
  })

  describe("findOne", () => {
    it("should return a daylight capsule by id", async () => {
      const viewDto: ViewDaylightCapsuleDto = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Test Content",
        isLocked: false,
        sunrise: new Date().toISOString(),
        sunset: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDaylightCapsuleService.findOne.mockResolvedValue(viewDto)

      const result = await controller.findOne("capsule123")

      expect(service.findOne).toHaveBeenCalledWith("capsule123")
      expect(result).toEqual(viewDto)
    })
  })

  describe("findAll", () => {
    it("should return all daylight capsules for the user", async () => {
      const userId = "user123"

      const viewDtos: ViewDaylightCapsuleDto[] = [
        {
          id: "capsule123",
          title: "Test Capsule 1",
          content: "Test Content 1",
          isLocked: false,
          sunrise: new Date().toISOString(),
          sunset: new Date().toISOString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "capsule456",
          title: "Test Capsule 2",
          isLocked: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDaylightCapsuleService.findAll.mockResolvedValue(viewDtos)

      const result = await controller.findAll({ user: { id: userId } })

      expect(service.findAll).toHaveBeenCalledWith(userId)
      expect(result).toEqual(viewDtos)
    })
  })
})
