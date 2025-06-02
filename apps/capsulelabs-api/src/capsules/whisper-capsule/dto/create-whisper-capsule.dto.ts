import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max, IsEnum } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { WeatherType, TemperatureOperator } from "../entities/whisper-capsule.entity"

export class CreateWhisperCapsuleDto {
  @ApiProperty({ description: "Title of the whisper capsule" })
  @IsNotEmpty()
  @IsString()
  title: string

  @ApiProperty({ description: "Content of the whisper capsule" })
  @IsNotEmpty()
  @IsString()
  content: string

  @ApiProperty({ description: "Latitude of the location (-90 to 90)" })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number

  @ApiProperty({ description: "Longitude of the location (-180 to 180)" })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number

  @ApiProperty({ description: "Human-readable location name" })
  @IsNotEmpty()
  @IsString()
  locationName: string

  @ApiProperty({
    description: "Required weather type for unlocking",
    enum: WeatherType,
    required: false,
  })
  @IsOptional()
  @IsEnum(WeatherType)
  requiredWeatherType?: WeatherType

  @ApiProperty({
    description: "Temperature comparison operator",
    enum: TemperatureOperator,
    required: false,
  })
  @IsOptional()
  @IsEnum(TemperatureOperator)
  temperatureOperator?: TemperatureOperator

  @ApiProperty({
    description: "Temperature value in Celsius (or minimum for 'between')",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  temperatureValue?: number

  @ApiProperty({
    description: "Maximum temperature value in Celsius (only for 'between' operator)",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  temperatureValueMax?: number
}
