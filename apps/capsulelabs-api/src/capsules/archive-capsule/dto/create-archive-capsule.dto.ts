import { IsNotEmpty, IsString, IsInt, IsOptional, IsBoolean, IsNumber, Min, Max, IsEnum, IsUrl } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { MediaType } from "../entities/archive-capsule.entity"

export class CreateArchiveCapsuleDto {
  @ApiProperty({ description: "Title of the archive capsule" })
  @IsNotEmpty()
  @IsString()
  title: string

  @ApiProperty({ description: "Content of the archive capsule" })
  @IsNotEmpty()
  @IsString()
  content: string

  @ApiProperty({ description: "URL of the media file" })
  @IsNotEmpty()
  @IsUrl()
  mediaUrl: string

  @ApiProperty({ description: "Title of the media" })
  @IsNotEmpty()
  @IsString()
  mediaTitle: string

  @ApiProperty({ description: "Type of media", enum: MediaType })
  @IsEnum(MediaType)
  mediaType: MediaType

  @ApiProperty({ description: "Duration of the media in seconds" })
  @IsInt()
  @Min(1)
  mediaDurationSeconds: number

  @ApiProperty({ description: "Minimum engagement time required in seconds" })
  @IsInt()
  @Min(1)
  minimumEngagementSeconds: number

  @ApiProperty({
    description: "Minimum completion percentage required (0.0 to 1.0)",
    default: 0.8,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minimumCompletionPercentage?: number

  @ApiProperty({
    description: "Whether full completion is required",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requireFullCompletion?: boolean

  @ApiProperty({
    description: "Whether pausing is allowed",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowPausing?: boolean

  @ApiProperty({
    description: "Maximum allowed pause time in seconds",
    default: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxPauseTimeSeconds?: number
}
