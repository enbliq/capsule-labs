import { IsNumber, IsBoolean, IsOptional, IsString, IsDate, IsObject } from "class-validator"

export class OrientationDataDto {
  @IsNumber()
  alpha: number // Z-axis rotation [0-360]

  @IsNumber()
  beta: number // X-axis rotation [-180, 180]

  @IsNumber()
  gamma: number // Y-axis rotation [-90, 90]

  @IsOptional()
  @IsBoolean()
  absolute?: boolean

  @IsOptional()
  @IsObject()
  accelerometer?: {
    x: number
    y: number
    z: number
  }

  @IsOptional()
  @IsString()
  deviceId?: string

  @IsOptional()
  @IsString()
  deviceOrientation?: "portrait" | "landscape" | "portrait-secondary" | "landscape-secondary"
}

export class FlipStatusDto {
  @IsBoolean()
  isFlipped: boolean

  @IsNumber()
  elapsedTime: number // in milliseconds

  @IsNumber()
  remainingTime: number // in milliseconds

  @IsBoolean()
  isComplete: boolean

  @IsOptional()
  @IsString()
  sessionId?: string
}

export class FlipSessionDto {
  @IsString()
  sessionId: string

  @IsDate()
  startTime: Date

  @IsOptional()
  @IsDate()
  endTime?: Date

  @IsNumber()
  requiredDuration: number // in milliseconds

  @IsBoolean()
  isComplete: boolean

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>
}

export class FlipChallengeConfigDto {
  @IsNumber()
  requiredDuration = 30000 // 30 seconds in milliseconds

  @IsNumber()
  betaThreshold = 150 // Beta angle threshold for "flipped" state

  @IsNumber()
  gammaThreshold = 0 // Gamma angle threshold (not as important for flip detection)

  @IsNumber()
  stabilityThreshold = 15 // Maximum movement allowed while maintaining "flipped" state

  @IsBoolean()
  requireAbsoluteSensors = false
}
