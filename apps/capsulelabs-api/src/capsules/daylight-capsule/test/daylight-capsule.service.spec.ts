import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { DaylightCapsuleService } from "../daylight-capsule.service"
import { DaylightCapsule } from "../entities/daylight-capsule.entity"
import type { CreateDaylightCapsuleDto } from "../dto/create-daylight-capsule.dto"
import { NotFoundException } from "@nestjs/common"

// Mock the sunrise-sunset-js library
jest.mock("sunrise-sunset-js", () => ({
  SunriseSunsetJS: {
    getSunrise: jest.fn(),
    getSunset: jest.fn(),
  },
}))

const SunriseSunsetJS = require("sunrise-sunset-js").SunriseSunsetJS

describe("DaylightCapsuleService", () => {
  let service: DaylightCapsuleService
  let repository: Repository<DaylightCapsule>

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DaylightCapsuleService,
        {
          provide: getRepositoryToken(DaylightCapsule),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<DaylightCapsuleService>(DaylightCapsuleService)
    repository = module.get<Repository<DaylightCapsule>>(getRepositoryToken(DaylightCapsule))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("create", () => {
    it("should create a new daylight capsule", async () => {
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

      mockRepository.create.mockReturnValue(capsule)
      mockRepository.save.mockResolvedValue(capsule)

      const result = await service.create(createDto, userId)

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        userId,
      })
      expect(mockRepository.save).toHaveBeenCalledWith(capsule)
      expect(result).toEqual(capsule)
    })
  })

  describe("findOne", () => {
    it("should return unlocked capsule during daylight hours", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        latitude: 40.7128,
        longitude: -74.006,
        timezone: "America/New_York",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.findOne.mockResolvedValue(capsule)

      // Mock sunrise and sunset times
      const now = new Date("2023-06-15T12:00:00Z") // Noon
      const sunrise = new Date("2023-06-15T05:00:00Z")
      const sunset = new Date("2023-06-15T20:00:00Z")

      SunriseSunsetJS.getSunrise.mockReturnValue(sunrise)
      SunriseSunsetJS.getSunset.mockReturnValue(sunset)

      const result = await service.findOne("capsule123", now)

      expect(result.isLocked).toBe(false)
      expect(result.content).toBe("Secret Content")
    })

    it("should return locked capsule during nighttime", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        latitude: 40.7128,
        longitude: -74.006,
        timezone: "America/New_York",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.findOne.mockResolvedValue(capsule)

      // Mock sunrise and sunset times
      const now = new Date("2023-06-15T23:00:00Z") // 11 PM
      const sunrise = new Date("2023-06-15T05:00:00Z")
      const sunset = new Date("2023-06-15T20:00:00Z")

      SunriseSunsetJS.getSunrise.mockReturnValue(sunrise)
      SunriseSunsetJS.getSunset.mockReturnValue(sunset)

      const result = await service.findOne("capsule123", now)

      expect(result.isLocked).toBe(true)
      expect(result.content).toBeUndefined()
    })

    it("should throw NotFoundException when capsule not found", async () => {
      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.findOne("nonexistent")).rejects.toThrow(NotFoundException)
    })
  })
})
