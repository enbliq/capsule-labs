import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { WhisperCapsuleService } from "../whisper-capsule.service"
import { WeatherService } from "../services/weather.service"
import { WhisperCapsule, WeatherType, TemperatureOperator } from "../entities/whisper-capsule.entity"
import { WeatherCheck } from "../entities/weather-check.entity"
import type { CreateWhisperCapsuleDto } from "../dto/create-whisper-capsule.dto"
import type { CheckWeatherUnlockDto } from "../dto/check-weather-unlock.dto"
import { NotFoundException } from "@nestjs/common"

describe("WhisperCapsuleService", () => {
  let service: WhisperCapsuleService
  let weatherService: WeatherService
  let capsuleRepository: Repository<WhisperCapsule>
  let weatherCheckRepository: Repository<WeatherCheck>

  const mockCapsuleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }

  const mockWeatherCheckRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  const mockWeatherService = {
    getCurrentWeather: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhisperCapsuleService,
        {
          provide: getRepositoryToken(WhisperCapsule),
          useValue: mockCapsuleRepository,
        },
        {
          provide: getRepositoryToken(WeatherCheck),
          useValue: mockWeatherCheckRepository,
        },
        {
          provide: WeatherService,
          useValue: mockWeatherService,
        },
      ],
    }).compile()

    service = module.get<WhisperCapsuleService>(WhisperCapsuleService)
    weatherService = module.get<WeatherService>(WeatherService)
    capsuleRepository = module.get<Repository<WhisperCapsule>>(getRepositoryToken(WhisperCapsule))
    weatherCheckRepository = module.get<Repository<WeatherCheck>>(getRepositoryToken(WeatherCheck))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("create", () => {
    it("should create a new whisper capsule with weather conditions", async () => {
      const createDto: CreateWhisperCapsuleDto = {
        title: "Rainy Day Capsule",
        content: "This unlocks when it's raining",
        latitude: 40.7128,
        longitude: -74.006,
        locationName: "New York City",
        requiredWeatherType: WeatherType.RAIN,
        temperatureOperator: TemperatureOperator.BELOW,
        temperatureValue: 20,
      }

      const userId = "user123"

      const capsule = {
        id: "capsule123",
        ...createDto,
        userId,
        unlocked: false,
        checkCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockCapsuleRepository.create.mockReturnValue(capsule)
      mockCapsuleRepository.save.mockResolvedValue(capsule)

      const result = await service.create(createDto, userId)

      expect(mockCapsuleRepository.create).toHaveBeenCalledWith({
        ...createDto,
        userId,
        unlocked: false,
      })
      expect(mockCapsuleRepository.save).toHaveBeenCalledWith(capsule)
      expect(result).toEqual(capsule)
    })

    it("should throw error if no weather conditions are specified", async () => {
      const createDto: CreateWhisperCapsuleDto = {
        title: "Invalid Capsule",
        content: "No conditions",
        latitude: 40.7128,
        longitude: -74.006,
        locationName: "New York City",
      }

      await expect(service.create(createDto, "user123")).rejects.toThrow(
        "At least one weather condition (weather type or temperature) must be specified",
      )
    })

    it("should throw error for invalid temperature range", async () => {
      const createDto: CreateWhisperCapsuleDto = {
        title: "Invalid Range Capsule",
        content: "Invalid range",
        latitude: 40.7128,
        longitude: -74.006,
        locationName: "New York City",
        temperatureOperator: TemperatureOperator.BETWEEN,
        temperatureValue: 25,
        temperatureValueMax: 20, // Max less than min
      }

      await expect(service.create(createDto, "user123")).rejects.toThrow(
        "Minimum temperature must be less than maximum temperature",
      )
    })
  })

  describe("checkWeatherUnlock", () => {
    it("should unlock capsule when weather conditions are met", async () => {
      const capsule = {
        id: "capsule123",
        title: "Rainy Day Capsule",
        content: "Secret rainy content",
        userId: "user123",
        latitude: 40.7128,
        longitude: -74.006,
        locationName: "New York City",
        requiredWeatherType: WeatherType.RAIN,
        temperatureOperator: TemperatureOperator.BELOW,
        temperatureValue: 20,
        unlocked: false,
        checkCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const weatherData = {
        temperature: 15,
        weatherType: "rain",
        description: "light rain",
        humidity: 80,
        pressure: 1010,
        windSpeed: 5,
        location: { name: "New York", country: "US" },
      }

      const checkDto: CheckWeatherUnlockDto = {}

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)
      mockWeatherService.getCurrentWeather.mockResolvedValue(weatherData)
      mockWeatherCheckRepository.create.mockReturnValue({
        capsuleId: capsule.id,
        userId: capsule.userId,
        actualTemperature: weatherData.temperature,
        actualWeatherType: weatherData.weatherType,
        conditionMet: true,
      })
      mockWeatherCheckRepository.save.mockResolvedValue({})
      mockCapsuleRepository.save.mockResolvedValue({ ...capsule, unlocked: true, checkCount: 1 })

      const result = await service.checkWeatherUnlock("capsule123", checkDto, "user123")

      expect(result.unlocked).toBe(true)
      expect(result.content).toBe("Secret rainy content")
      expect(result.currentWeather.conditionMet).toBe(true)
      expect(result.currentWeather.temperature).toBe(15)
      expect(result.currentWeather.weatherType).toBe("rain")

      expect(mockWeatherService.getCurrentWeather).toHaveBeenCalledWith(40.7128, -74.006)
    })

    it("should keep capsule locked when weather conditions are not met", async () => {
      const capsule = {
        id: "capsule123",
        title: "Rainy Day Capsule",
        content: "Secret rainy content",
        userId: "user123",
        latitude: 40.7128,
        longitude: -74.006,
        locationName: "New York City",
        requiredWeatherType: WeatherType.RAIN,
        temperatureOperator: TemperatureOperator.BELOW,
        temperatureValue: 20,
        unlocked: false,
        checkCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const weatherData = {
        temperature: 25, // Too warm
        weatherType: "clear", // Wrong weather type
        description: "clear sky",
        humidity: 40,
        pressure: 1020,
        windSpeed: 2,
        location: { name: "New York", country: "US" },
      }

      const checkDto: CheckWeatherUnlockDto = {}

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)
      mockWeatherService.getCurrentWeather.mockResolvedValue(weatherData)
      mockWeatherCheckRepository.create.mockReturnValue({
        capsuleId: capsule.id,
        userId: capsule.userId,
        actualTemperature: weatherData.temperature,
        actualWeatherType: weatherData.weatherType,
        conditionMet: false,
      })
      mockWeatherCheckRepository.save.mockResolvedValue({})
      mockCapsuleRepository.save.mockResolvedValue({ ...capsule, checkCount: 1 })

      const result = await service.checkWeatherUnlock("capsule123", checkDto, "user123")

      expect(result.unlocked).toBe(false)
      expect(result.content).toBeUndefined()
      expect(result.currentWeather.conditionMet).toBe(false)
      expect(result.currentWeather.temperature).toBe(25)
      expect(result.currentWeather.weatherType).toBe("clear")
    })

    it("should use override coordinates when provided", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Test content",
        userId: "user123",
        latitude: 40.7128,
        longitude: -74.006,
        locationName: "New York City",
        requiredWeatherType: WeatherType.CLEAR,
        unlocked: false,
        checkCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const weatherData = {
        temperature: 22,
        weatherType: "clear",
        description: "clear sky",
        humidity: 50,
        pressure: 1015,
        windSpeed: 3,
        location: { name: "Los Angeles", country: "US" },
      }

      const checkDto: CheckWeatherUnlockDto = {
        latitude: 34.0522,
        longitude: -118.2437,
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)
      mockWeatherService.getCurrentWeather.mockResolvedValue(weatherData)
      mockWeatherCheckRepository.create.mockReturnValue({})
      mockWeatherCheckRepository.save.mockResolvedValue({})
      mockCapsuleRepository.save.mockResolvedValue({ ...capsule, unlocked: true, checkCount: 1 })

      await service.checkWeatherUnlock("capsule123", checkDto, "user123")

      expect(mockWeatherService.getCurrentWeather).toHaveBeenCalledWith(34.0522, -118.2437)
    })

    it("should throw error if capsule not found", async () => {
      mockCapsuleRepository.findOne.mockResolvedValue(null)

      await expect(service.checkWeatherUnlock("nonexistent", {}, "user123")).rejects.toThrow(NotFoundException)
    })

    it("should throw error if user doesn't own the capsule", async () => {
      const capsule = {
        id: "capsule123",
        userId: "user123",
        unlocked: false,
        checkCount: 0,
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)

      await expect(service.checkWeatherUnlock("capsule123", {}, "different-user")).rejects.toThrow(
        "You don't have permission to access this capsule",
      )
    })
  })
})
