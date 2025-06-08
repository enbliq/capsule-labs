import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, IsBoolean, Min, Max } from "class-validator"

export class CreateSessionDto {
  @ApiProperty({ description: "User ID", example: "user-123" })
  @IsString()
  @IsNotEmpty()
  userId: string

  @ApiProperty({ description: "Custom session settings", required: false })
  @IsOptional()
  settings?: MeditationSettingsDto
}

export class MeditationSettingsDto {
  @ApiProperty({ description: "Session duration in milliseconds", example: 180000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(30000) // Minimum 30 seconds
  @Max(3600000) // Maximum 1 hour
  duration?: number

  @ApiProperty({ description: "Allow pauses during session", example: true, required: false })
  @IsOptional()
  @IsBoolean()
  allowPauses?: boolean

  @ApiProperty({ description: "Maximum number of pauses allowed", example: 3, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxPauses?: number

  @ApiProperty({ description: "Grace period for pauses in milliseconds", example: 30000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(5000)
  @Max(120000)
  pauseGracePeriod?: number

  @ApiProperty({ description: "Movement detection sensitivity", example: "medium", required: false })
  @IsOptional()
  @IsIn(["low", "medium", "high"])
  movementSensitivity?: "low" | "medium" | "high"

  @ApiProperty({ description: "Noise detection sensitivity", example: "medium", required: false })
  @IsOptional()
  @IsIn(["low", "medium", "high"])
  noiseSensitivity?: "low" | "medium" | "high"

  @ApiProperty({ description: "Allow screen exit during session", example: false, required: false })
  @IsOptional()
  @IsBoolean()
  allowScreenExit?: boolean

  @ApiProperty({ description: "Auto-fail on any interruption", example: false, required: false })
  @IsOptional()
  @IsBoolean()
  autoFailOnInterruption?: boolean
}

export class InterruptionDto {
  @ApiProperty({ description: "Type of interruption", example: "movement", enum: ["movement", "noise", "screen_exit"] })
  @IsString()
  @IsIn(["movement", "noise", "screen_exit"])
  type: "movement" | "noise" | "screen_exit"

  @ApiProperty({
    description: "Severity of interruption",
    example: "medium",
    enum: ["low", "medium", "high"],
    required: false,
  })
  @IsOptional()
  @IsIn(["low", "medium", "high"])
  severity?: "low" | "medium" | "high"

  @ApiProperty({ description: "Description of the interruption", example: "User moved their hand", required: false })
  @IsOptional()
  @IsString()
  description?: string
}

export class PauseSessionDto {
  @ApiProperty({ description: "Reason for pausing", example: "User requested pause", required: false })
  @IsOptional()
  @IsString()
  reason?: string
}
