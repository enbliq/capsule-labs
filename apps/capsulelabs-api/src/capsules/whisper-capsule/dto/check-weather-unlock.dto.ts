import { IsOptional, IsNumber, Min, Max } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CheckWeatherUnlockDto {
  @ApiProperty({
    description: "Override latitude for weather check (optional)",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number

  @ApiProperty({
    description: "Override longitude for weather check (optional)",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number
}
