import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, Min, Max } from "class-validator"
import { Type } from "class-transformer"
import type { ContentType } from "../../base-capsule.schema"

class LocationDto {
  @IsNumber()
  lat: number

  @IsNumber()
  lng: number
}

export class PlantTimeBombDto {
  @IsEnum(["text", "media"])
  contentType: ContentType

  @IsOptional()
  @IsString()
  message?: string

  @IsOptional()
  @IsString()
  mediaUrl?: string

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto

  @IsNumber()
  @Min(1)
  @Max(60) // Setting a reasonable maximum lifespan
  lifespanMinutes: number

  @IsNumber()
  @Min(1)
  @Max(10) // Setting a reasonable maximum number of defusers
  maxDefusers: number

  @IsNotEmpty()
  @IsString()
  username: string // Creator's username
}
