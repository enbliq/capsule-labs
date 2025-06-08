import { IsNumber, IsBoolean, IsOptional, IsString, IsDate, IsObject } from "class-validator"
import { Transform } from "class-transformer"

export class SyncAttemptDto {
  @IsString()
  pulseId: string

  @Transform(({ value }) => new Date(value))
  @IsDate()
  clientTimestamp: Date

  @Transform(({ value }) => new Date(value))
  @IsDate()
  serverTimestamp: Date

  @IsOptional()
  @IsNumber()
  networkLatency?: number // in milliseconds

  @IsOptional()
  @IsString()
  timeZone?: string

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>
}

export class TimeSyncResponseDto {
  @IsBoolean()
  success: boolean

  @IsNumber()
  timeDifference: number // in milliseconds

  @IsNumber()
  allowedWindow: number // in milliseconds (±3000ms)

  @IsBoolean()
  withinWindow: boolean

  @IsOptional()
  @IsString()
  message?: string

  @IsOptional()
  @IsBoolean()
  capsuleUnlocked?: boolean
}

export class SyncPulseDto {
  @IsString()
  pulseId: string

  @Transform(({ value }) => new Date(value))
  @IsDate()
  scheduledTime: Date

  @Transform(({ value }) => new Date(value))
  @IsDate()
  actualBroadcastTime: Date

  @IsNumber()
  windowStartMs: number // milliseconds before scheduled time

  @IsNumber()
  windowEndMs: number // milliseconds after scheduled time

  @IsBoolean()
  isActive: boolean

  @IsOptional()
  @IsString()
  description?: string
}

export class TimeServerResponseDto {
  @Transform(({ value }) => new Date(value))
  @IsDate()
  serverTime: Date

  @Transform(({ value }) => new Date(value))
  @IsDate()
  utcTime: Date

  @IsNumber()
  timestamp: number // Unix timestamp in milliseconds

  @IsOptional()
  @IsNumber()
  ntpOffset?: number // NTP time correction offset

  @IsOptional()
  @IsString()
  timeZone?: string

  @IsOptional()
  @IsObject()
  nextPulse?: {
    pulseId: string
    scheduledTime: Date
    countdown: number // milliseconds until pulse
  }
}

export class NTPSyncDto {
  @Transform(({ value }) => new Date(value))
  @IsDate()
  clientSentTime: Date

  @Transform(({ value }) => new Date(value))
  @IsDate()
  serverReceivedTime: Date

  @Transform(({ value }) => new Date(value))
  @IsDate()
  serverSentTime: Date

  @Transform(({ value }) => new Date(value))
  @IsDate()
  clientReceivedTime: Date

  @IsNumber()
  roundTripTime: number // in milliseconds

  @IsNumber()
  clockOffset: number // in milliseconds
}
