import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, Min, Max } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { MediaEventType } from "../entities/media-engagement.entity"

export class MediaEventDto {
  @ApiProperty({ description: "Session ID for tracking continuous engagement" })
  @IsNotEmpty()
  @IsString()
  sessionId: string

  @ApiProperty({ description: "Type of media event", enum: MediaEventType })
  @IsEnum(MediaEventType)
  eventType: MediaEventType

  @ApiProperty({ description: "Current playback time in seconds" })
  @IsNumber()
  @Min(0)
  currentTime: number

  @ApiProperty({ description: "Previous playback time in seconds (for seek events)", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  previousTime?: number

  @ApiProperty({ description: "Total duration of the media in seconds", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number

  @ApiProperty({ description: "Playback rate (1.0 = normal speed)", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  playbackRate?: number

  @ApiProperty({ description: "Volume level (0.0 to 1.0)", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  volume?: number

  @ApiProperty({ description: "Additional metadata as JSON string", required: false })
  @IsOptional()
  @IsString()
  metadata?: string
}
