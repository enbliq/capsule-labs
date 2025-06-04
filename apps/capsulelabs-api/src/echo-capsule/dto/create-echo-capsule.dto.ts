import { IsEnum, IsOptional, IsString, MaxLength, MinLength, IsNumber, Min, Max } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { SoundPattern } from "../enums/sound-pattern.enum"

export class CreateEchoCapsuleDto {
  @ApiProperty({
    enum: SoundPattern,
    description: "Type of sound pattern that will trigger the unlock",
    example: SoundPattern.WHISTLE,
  })
  @IsEnum(SoundPattern)
  soundPattern: SoundPattern

  @ApiPropertyOptional({
    description: "Title or name for the echo capsule",
    example: "My Secret Whistle Message",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @ApiPropertyOptional({
    description: "Content to be stored in the echo capsule",
    example: "This message unlocks when you whistle our special tune!",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string

  @ApiPropertyOptional({
    description: "Creator or owner of the echo capsule",
    example: "Jane Smith",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  createdBy?: string

  @ApiPropertyOptional({
    description: "Confidence threshold for sound detection (0.0 - 1.0)",
    example: 0.8,
    minimum: 0.0,
    maximum: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  confidenceThreshold?: number

  @ApiPropertyOptional({
    description: "Path to reference audio file for custom sound patterns",
    example: "/uploads/reference-sounds/my-whistle.wav",
  })
  @IsOptional()
  @IsString()
  referenceAudioPath?: string
}
