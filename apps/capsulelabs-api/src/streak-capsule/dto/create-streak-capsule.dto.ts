import { IsString, IsOptional, IsEnum, IsDateString, IsObject, IsInt, Min, Max, IsBoolean } from "class-validator"
import { StreakCapsuleType } from "../entities/streak-capsule.entity"

export class CreateStreakCapsuleDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsObject()
  content: Record<string, any>

  @IsEnum(StreakCapsuleType)
  type: StreakCapsuleType

  @IsString()
  userId: string

  @IsInt()
  @Min(1)
  @Max(365)
  requiredStreakDays: number

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsBoolean()
  allowGracePeriod?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(48)
  gracePeriodHours?: number

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
