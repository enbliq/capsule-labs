import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type WhisperCapsule, TemperatureOperator } from "./entities/whisper-capsule.entity"
import type { WeatherCheck } from "./entities/weather-check.entity"
import type { WeatherService, WeatherData } from "./services/weather.service"
import type { CreateWhisperCapsuleDto } from "./dto/create-whisper-capsule.dto"
import type { CheckWeatherUnlockDto } from "./dto/check-weather-unlock.dto"
import type { ViewWhisperCapsuleDto } from "./dto/view-whisper-capsule.dto"

@Injectable()
export class WhisperCapsuleService {
  constructor(
    private readonly whisperCapsuleRepository: Repository<WhisperCapsule>,
    private readonly weatherCheckRepository: Repository<WeatherCheck>,
    private readonly weatherService: WeatherService,
  ) {}

  async create(createWhisperCapsuleDto: CreateWhisperCapsuleDto, userId: string): Promise<WhisperCapsule> {
    // Validate temperature conditions
    if (createWhisperCapsuleDto.temperatureOperator) {
      this.validateTemperatureCondition(createWhisperCapsuleDto)
    }

    // Ensure at least one condition is specified
    if (!createWhisperCapsuleDto.requiredWeatherType && !createWhisperCapsuleDto.temperatureOperator) {
      throw new Error("At least one weather condition (weather type or temperature) must be specified")
    }

    const capsule = this.whisperCapsuleRepository.create({
      ...createWhisperCapsuleDto,
      userId,
      unlocked: false,
    })

    return this.whisperCapsuleRepository.save(capsule)
  }

  async findOne(id: string): Promise<WhisperCapsule> {
    const capsule = await this.whisperCapsuleRepository.findOne({ where: { id } })

    if (!capsule) {
      throw new NotFoundException(`Whisper capsule with ID ${id} not found`)
    }

    return capsule
  }

  async findAll(userId: string): Promise<WhisperCapsule[]> {
    return this.whisperCapsuleRepository.find({
      where: { userId },
    })
  }

  async checkWeatherUnlock(
    id: string,
    checkWeatherDto: CheckWeatherUnlockDto,
    userId: string,
  ): Promise<ViewWhisperCapsuleDto> {
    const capsule = await this.findOne(id)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule")
    }

    // Use override coordinates if provided, otherwise use capsule's location
    const latitude = checkWeatherDto.latitude ?? capsule.latitude
    const longitude = checkWeatherDto.longitude ?? capsule.longitude

    // Fetch current weather data
    const weatherData = await this.weatherService.getCurrentWeather(latitude, longitude)

    // Check if weather conditions are met
    const conditionMet = this.evaluateWeatherConditions(capsule, weatherData)

    // Log the weather check
    await this.logWeatherCheck(capsule.id, userId, weatherData, conditionMet)

    // Update capsule if conditions are met and not already unlocked
    if (conditionMet && !capsule.unlocked) {
      capsule.unlocked = true
      capsule.unlockedAt = new Date()
      await this.whisperCapsuleRepository.save(capsule)
    }

    // Update check count
    capsule.checkCount += 1
    await this.whisperCapsuleRepository.save(capsule)

    // Build response
    const response: ViewWhisperCapsuleDto = {
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
      currentWeather: {
        temperature: weatherData.temperature,
        weatherType: weatherData.weatherType,
        description: weatherData.description,
        humidity: weatherData.humidity,
        pressure: weatherData.pressure,
        windSpeed: weatherData.windSpeed,
        conditionMet,
      },
      checkCount: capsule.checkCount,
      unlockedAt: capsule.unlockedAt,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }

    // Only include content if unlocked
    if (capsule.unlocked) {
      response.content = capsule.content
    }

    return response
  }

  private validateTemperatureCondition(dto: CreateWhisperCapsuleDto): void {
    const { temperatureOperator, temperatureValue, temperatureValueMax } = dto

    if (!temperatureValue && temperatureValue !== 0) {
      throw new Error("Temperature value is required when temperature operator is specified")
    }

    if (temperatureOperator === TemperatureOperator.BETWEEN) {
      if (!temperatureValueMax && temperatureValueMax !== 0) {
        throw new Error("Maximum temperature value is required for 'between' operator")
      }
      if (temperatureValue >= temperatureValueMax) {
        throw new Error("Minimum temperature must be less than maximum temperature")
      }
    }
  }

  private evaluateWeatherConditions(capsule: WhisperCapsule, weatherData: WeatherData): boolean {
    let weatherTypeMatch = true
    let temperatureMatch = true

    // Check weather type condition
    if (capsule.requiredWeatherType) {
      weatherTypeMatch = weatherData.weatherType === capsule.requiredWeatherType
    }

    // Check temperature condition
    if (capsule.temperatureOperator && (capsule.temperatureValue || capsule.temperatureValue === 0)) {
      switch (capsule.temperatureOperator) {
        case TemperatureOperator.ABOVE:
          temperatureMatch = weatherData.temperature > capsule.temperatureValue
          break
        case TemperatureOperator.BELOW:
          temperatureMatch = weatherData.temperature < capsule.temperatureValue
          break
        case TemperatureOperator.EQUALS:
          // Allow for small tolerance (±0.5°C) for equals comparison
          temperatureMatch = Math.abs(weatherData.temperature - capsule.temperatureValue) <= 0.5
          break
        case TemperatureOperator.BETWEEN:
          temperatureMatch =
            weatherData.temperature >= capsule.temperatureValue &&
            weatherData.temperature <= capsule.temperatureValueMax
          break
        default:
          temperatureMatch = true
      }
    }

    return weatherTypeMatch && temperatureMatch
  }

  private async logWeatherCheck(
    capsuleId: string,
    userId: string,
    weatherData: WeatherData,
    conditionMet: boolean,
  ): Promise<void> {
    const weatherCheck = this.weatherCheckRepository.create({
      capsuleId,
      userId,
      actualTemperature: weatherData.temperature,
      actualWeatherType: weatherData.weatherType,
      actualWeatherDescription: weatherData.description,
      humidity: weatherData.humidity,
      pressure: weatherData.pressure,
      windSpeed: weatherData.windSpeed,
      conditionMet,
      weatherApiResponse: JSON.stringify(weatherData),
    })

    await this.weatherCheckRepository.save(weatherCheck)
  }

  async getWeatherHistory(capsuleId: string, userId: string): Promise<WeatherCheck[]> {
    const capsule = await this.findOne(capsuleId)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule's history")
    }

    return this.weatherCheckRepository.find({
      where: { capsuleId },
      order: { createdAt: "DESC" },
    })
  }

  async getCurrentWeatherForLocation(latitude: number, longitude: number): Promise<WeatherData> {
    return this.weatherService.getCurrentWeather(latitude, longitude)
  }
}
