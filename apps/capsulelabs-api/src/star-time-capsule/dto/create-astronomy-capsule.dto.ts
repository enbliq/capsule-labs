import { IsEnum, IsDateString, IsOptional, IsString, MaxLength, MinLength } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { AstronomicalEventType } from "../enums/astronomical-event.enum"

export class CreateAstronomyCapsuleDto {
  @ApiProperty({
    enum: AstronomicalEventType,
    description: "Type of astronomical event that will trigger the unlock",
    example: AstronomicalEventType.FULL_MOON,
  })
  @IsEnum(AstronomicalEventType)
  eventType: AstronomicalEventType

  @ApiProperty({
    description: "Expected date and time of the astronomical event (ISO 8601 format)",
    example: "2024-12-15T02:30:00Z",
  })
  @IsDateString()
  expectedDate: string

  @ApiPropertyOptional({
    description: "Title or name for the time capsule",
    example: "My Full Moon Wishes",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @ApiPropertyOptional({
    description: "Content to be stored in the time capsule",
    example: "Dear future me, I hope you remember this moment...",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string

  @ApiPropertyOptional({
    description: "Creator or owner of the time capsule",
    example: "John Doe",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  createdBy?: string
}
