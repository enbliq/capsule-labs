import { ApiProperty } from "@nestjs/swagger"
import { WeatherType, TemperatureOperator } from "../entities/whisper-capsule.entity"

export class WeatherConditionDto {
  @ApiProperty({ enum: WeatherType, required: false })
  requiredWeatherType?: WeatherType

  @ApiProperty({ enum: TemperatureOperator, required: false })
  temperatureOperator?: TemperatureOperator

  @ApiProperty({ required: false })
  temperatureValue?: number

  @ApiProperty({ required: false })
  temperatureValueMax?: number
}

export class CurrentWeatherDto {
  @ApiProperty()
  temperature: number

  @ApiProperty()
  weatherType: string

  @ApiProperty()
  description: string

  @ApiProperty()
  humidity: number

  @ApiProperty()
  pressure: number

  @ApiProperty()
  windSpeed: number

  @ApiProperty()
  conditionMet: boolean
}

export class ViewWhisperCapsuleDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiProperty({ required: false })
  content?: string

  @ApiProperty()
  unlocked: boolean

  @ApiProperty()
  latitude: number

  @ApiProperty()
  longitude: number

  @ApiProperty()
  locationName: string

  @ApiProperty({ type: WeatherConditionDto })
  condition: WeatherConditionDto

  @ApiProperty({ type: CurrentWeatherDto, required: false })
  currentWeather?: CurrentWeatherDto

  @ApiProperty()
  checkCount: number

  @ApiProperty({ required: false })
  unlockedAt?: Date

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
