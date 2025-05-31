import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
  Max,
  IsNotEmpty,
  ValidateNested,
  IsInt,
  Matches,
} from "class-validator"
import { Type } from "class-transformer"
import type { TimeWindow, GeoLocation } from "../entities/qr-capsule.entity"

export class TimeWindowDto implements TimeWindow {
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "startTime must be in HH:MM format",
  })
  startTime: string

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "endTime must be in HH:MM format",
  })
  endTime: string

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[]

  @IsOptional()
  @IsString()
  timezone?: string
}

export class CreateQrCapsuleDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsString()
  @IsNotEmpty()
  reward: string

  @IsString()
  @IsNotEmpty()
  createdBy: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  // Geo restrictions
  @IsOptional()
  @IsBoolean()
  geoLocked?: boolean

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  radiusMeters?: number

  // Time restrictions
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeWindowDto)
  timeWindow?: TimeWindowDto

  // Usage limits
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number
}

export class ScanQrDto {
  @IsString()
  @IsNotEmpty()
  qrCodeHash: string

  @IsString()
  @IsNotEmpty()
  userId: string

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoLocationDto)
  location?: GeoLocationDto
}

export class GeoLocationDto implements GeoLocation {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number
}

export class UpdateQrCapsuleDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  reward?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number
}

export class QrCapsuleQueryDto {
  @IsOptional()
  @IsString()
  createdBy?: string

  @IsOptional()
  @IsBoolean()
  unlocked?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number
}
