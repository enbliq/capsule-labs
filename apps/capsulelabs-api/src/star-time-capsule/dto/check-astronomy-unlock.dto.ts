import { IsUUID, IsOptional, IsEnum } from "class-validator"
import { ApiPropertyOptional } from "@nestjs/swagger"
import { AstronomicalEventType } from "../enums/astronomical-event.enum"

export class CheckAstronomyUnlockDto {
  @ApiPropertyOptional({
    description: "Specific capsule ID to check",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsUUID()
  capsuleId?: string

  @ApiPropertyOptional({
    enum: AstronomicalEventType,
    description: "Check capsules for specific event type only",
    example: AstronomicalEventType.FULL_MOON,
  })
  @IsOptional()
  @IsEnum(AstronomicalEventType)
  eventType?: AstronomicalEventType
}
