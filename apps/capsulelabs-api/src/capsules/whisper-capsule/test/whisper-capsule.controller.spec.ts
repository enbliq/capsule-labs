import { Test, type TestingModule } from "@nestjs/testing"
import { WhisperCapsuleController } from "../whisper-capsule.controller"
import { WhisperCapsuleService } from "../whisper-capsule.service"
import type { CreateWhisperCapsuleDto } from "../dto/create-whisper-capsule.dto"
import type { CheckWeatherUnlockDto } from "../dto/check-weather-unlock.dto"
import type { ViewWhisperCapsuleDto } from "../dto/view-whisper-capsule.dto"
import { WeatherType, TemperatureOperator } from "../entities/whisper-capsule.entity"

describe("WhisperCapsuleController", () => {
  let controller: WhisperCapsuleController
  let service: WhisperCapsuleService

  const mockWhisperCapsuleService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    checkWeatherUnlock: jest.fn(),
    getWeatherHistory: jest.fn(),
    getCurrentWeatherForLocation: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhisperCapsuleController],
      providers: [
        {
          provide: WhisperCapsuleService,
          useValue: mockWhisperCapsuleService,
        },
      ],
    }).compile()

    controller = module.get<WhisperCapsuleController>(WhisperCapsuleController)
    service = module.get<WhisperCapsuleService>(WhisperCapsuleService)
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
  })

  describe("create", () => {
    it("should create a whisper capsule", async () => {
      const createDto: CreateWhisperCapsuleDto = {
        title: "Snowy Day Capsule",
        content: "Winter memories",
        latitude: 40.7128,
        longitude: -74.006,
        locationName: "New York City",
        requiredWeatherType: WeatherType.SNOW,
        temperatureOperator: TemperatureOperator.BELOW,
        temperatureValue: 0,
      }

      const userId = "user123"

      const capsule = {
        id: "capsule123",
        ...createDto,
        userId,
        unlocked: false,
        checkCount: 0,
        unlockedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockWhisperCapsuleService.create.mockResolvedValue(capsule)

      const result = await controller.create(createDto, { user: { id: userId } })

      expect(mockWhisperCapsuleService.create).toHaveBeenCalledWith(createDto, userId)
      expect(result).toEqual({
        id: capsule.id,
        title: capsule.title,
        unlocked: capsule.unlocked,
        latitude: capsule.latitude,
        longitude: capsule.longitude,
        locationName: capsule.locationName,
        condition: {
          requiredWeatherType: capsule.requiredWeatherType,
          temperatureOperator: capsule.temperatureOperator,
          temperatureValue: capsule.temperatureValue,
          temperatureValueMax: capsule.temperatureValueMax,
        },
        checkCount: capsule.checkCount,
        unlockedAt: capsule.unlockedAt,
        createdAt: capsule.createdAt,
        updatedAt: capsule.updatedAt,
      })
    })
  })

  describe("checkWeatherUnlock", () => {
    it("should check weather and try to unlock capsule", async () => {
      const checkDto: CheckWeatherUnlockDto = {
        latitude: 34.0522,
        longitude: -118.2437,
      }

      const userId = "user123"

      const viewDto: ViewWhisperCapsuleDto = {
        id: "capsule123",
        title: "Sunny Day Capsule",
        content: "Summer memories",
        unlocked: true,
        latitude: 40.7128,
        longitude: -74.006,
        locationName: "New York City",
        condition: {
          requiredWeatherType: WeatherType.CLEAR,
          temperatureOperator: TemperatureOperator.ABOVE,
          temperatureValue: 25,
        },
        currentWeather: {
          temperature: 28,
          weatherType: "clear",
          description: "clear sky",
          humidity: 45,
          pressure: 1020,
          windSpeed: 3,
          conditionMet: true,
        },
        checkCount: 1,
        unlockedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockWhisperCapsuleService.checkWeatherUnlock.mockResolvedValue(viewDto)

      const result = await controller.checkWeatherUnlock("capsule123", checkDto, { user: { id: userId } })

      expect(mockWhisperCapsuleService.checkWeatherUnlock).toHaveBeenCalledWith("capsule123", checkDto, userId)
      expect(result).toEqual(viewDto)
    })
  })

  describe("findAll", () => {
    it("should return all whisper capsules for the user", async () => {
      const userId = "user123"

      const capsules = [
        {
          id: "capsule123",
          title: "Rainy Day Capsule",
          content: "Rainy content",
          userId,
          latitude: 40.7128,
          longitude: -74.006,
          locationName: "New York City",
          requiredWeatherType: WeatherType.RAIN,
          temperatureOperator: TemperatureOperator.BELOW,
          temperatureValue: 20,
          unlocked: false,
          checkCount: 2,
          unlockedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "capsule456",
          title: "Hot Day Capsule",
          content: "Summer content",
          userId,
          latitude: 34.0522,
          longitude: -118.2437,
          locationName: "Los Angeles",
          requiredWeatherType: null,
          temperatureOperator: TemperatureOperator.ABOVE,
          temperatureValue: 30,
          unlocked: true,
          checkCount: 1,
          unlockedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockWhisperCapsuleService.findAll.mockResolvedValue(capsules)

      const result = await controller.findAll({ user: { id: userId } })

      expect(mockWhisperCapsuleService.findAll).toHaveBeenCalledWith(userId)
      expect(result).toEqual([
        {
          id: "capsule123",
          title: "Rainy Day Capsule",
          unlocked: false,
          latitude: 40.7128,
          longitude: -74.006,
          locationName: "New York City",
          condition: {
            requiredWeatherType: WeatherType.RAIN,
            temperatureOperator: TemperatureOperator.BELOW,
            temperatureValue: 20,
            temperatureValueMax: undefined,
          },
          checkCount: 2,
          unlockedAt: null,
          createdAt: capsules[0].createdAt,
          updatedAt: capsules[0].updatedAt,
        },
        {
          id: "capsule456",
          title: "Hot Day Capsule",
          unlocked: true,
          latitude: 34.0522,
          longitude: -118.2437,
          locationName: "Los Angeles",
          condition: {
            requiredWeatherType: null,
            temperatureOperator: TemperatureOperator.ABOVE,
            temperatureValue: 30,
            temperatureValueMax: undefined,
          },
          checkCount: 1,
          unlockedAt: capsules[1].unlockedAt,
          createdAt: capsules[1].createdAt,
          updatedAt: capsules[1].updatedAt,
        },
      ])
    })
  })

  describe("getCurrentWeather", () => {
    it("should return current weather for coordinates", async () => {
      const weatherData = {
        temperature: 22,
        weatherType: "clear",
        description: "clear sky",
        humidity: 50,
        pressure: 1015,
        windSpeed: 3,
        location: { name: "Test City", country: "TC" },
      }

      mockWhisperCapsuleService.getCurrentWeatherForLocation.mockResolvedValue(weatherData)

      const result = await controller.getCurrentWeather(40.7128, -74.006)

      expect(mockWhisperCapsuleService.getCurrentWeatherForLocation).toHaveBeenCalledWith(40.7128, -74.006)
      expect(result).toEqual(weatherData)
    })
  })
})
