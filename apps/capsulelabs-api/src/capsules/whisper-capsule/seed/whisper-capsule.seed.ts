import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { WhisperCapsule, WeatherType, TemperatureOperator } from "../entities/whisper-capsule.entity"

@Injectable()
export class WhisperCapsuleSeed {
  private readonly whisperCapsuleRepository: Repository<WhisperCapsule>

  constructor(
    @InjectRepository(WhisperCapsule)
    whisperCapsuleRepository: Repository<WhisperCapsule>,
  ) {
    this.whisperCapsuleRepository = whisperCapsuleRepository;
  }

  async seed(): Promise<void> {
    // Clear existing data
    await this.whisperCapsuleRepository.clear()

    // Create sample whisper capsules with different weather conditions
    const capsules = [
      {
        title: "Rainy Day Memories",
        content: "This capsule contains my favorite rainy day memories and cozy indoor activities.",
        userId: "seed-user-1",
        latitude: 51.5074, // London
        longitude: -0.1278,
        locationName: "London, UK",
        requiredWeatherType: WeatherType.RAIN,
        temperatureOperator: null,
        temperatureValue: null,
        temperatureValueMax: null,
        unlocked: false,
        checkCount: 0,
      },
      {
        title: "Summer Beach Vibes",
        content: "Unlock this when it's hot and sunny for the perfect beach day playlist!",
        userId: "seed-user-1",
        latitude: 34.0522, // Los Angeles
        longitude: -118.2437,
        locationName: "Los Angeles, CA",
        requiredWeatherType: WeatherType.CLEAR,
        temperatureOperator: TemperatureOperator.ABOVE,
        temperatureValue: 25,
        temperatureValueMax: null,
        unlocked: false,
        checkCount: 0,
      },
      {
        title: "Winter Wonderland",
        content: "Snow day activities and hot chocolate recipes for the perfect winter day.",
        userId: "seed-user-2",
        latitude: 43.6532, // Toronto
        longitude: -79.3832,
        locationName: "Toronto, Canada",
        requiredWeatherType: WeatherType.SNOW,
        temperatureOperator: TemperatureOperator.BELOW,
        temperatureValue: 0,
        temperatureValueMax: null,
        unlocked: false,
        checkCount: 0,
      },
      {
        title: "Perfect Spring Day",
        content: "Outdoor activities and garden plans for the ideal spring weather.",
        userId: "seed-user-2",
        latitude: 48.8566, // Paris
        longitude: 2.3522,
        locationName: "Paris, France",
        requiredWeatherType: WeatherType.CLEAR,
        temperatureOperator: TemperatureOperator.BETWEEN,
        temperatureValue: 15,
        temperatureValueMax: 22,
        unlocked: false,
        checkCount: 0,
      },
      {
        title: "Stormy Night Stories",
        content: "Spooky stories and comfort food recipes for thunderstorm nights.",
        userId: "seed-user-1",
        latitude: 40.7128, // New York
        longitude: -74.006,
        locationName: "New York City, NY",
        requiredWeatherType: WeatherType.THUNDERSTORM,
        temperatureOperator: null,
        temperatureValue: null,
        temperatureValueMax: null,
        unlocked: false,
        checkCount: 0,
      },
      {
        title: "Foggy Morning Meditation",
        content: "Mindfulness exercises and peaceful music for misty, mysterious mornings.",
        userId: "seed-user-2",
        latitude: 37.7749, // San Francisco
        longitude: -122.4194,
        locationName: "San Francisco, CA",
        requiredWeatherType: WeatherType.FOG,
        temperatureOperator: TemperatureOperator.BETWEEN,
        temperatureValue: 10,
        temperatureValueMax: 18,
        unlocked: false,
        checkCount: 0,
      },
    ]

    // Save all capsules
    await this.whisperCapsuleRepository.save(capsules)

    console.log("Whisper capsule seed data created successfully")
  }
}
