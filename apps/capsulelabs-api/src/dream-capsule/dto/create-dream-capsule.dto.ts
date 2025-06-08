import { IsString, IsOptional, IsEnum, IsDateString, IsObject, IsInt, Min, Max } from "class-validator"
import { DreamCapsuleType } from "../entities/dream-capsule.entity"

export class CreateDreamCapsuleDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsObject()
  content: Record<string, any>

  @IsEnum(DreamCapsuleType)
  type: DreamCapsuleType

  @IsString()
  userId: string

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1000)
  minimumWordCount?: number

  @IsOptional()
  @IsString()
  cutoffTime?: string

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
