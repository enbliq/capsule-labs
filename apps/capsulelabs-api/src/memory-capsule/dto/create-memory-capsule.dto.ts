import { IsString, IsOptional, IsEnum, IsDateString, IsObject, IsInt, Min, Max } from "class-validator"
import { CapsuleType } from "../entities/memory-capsule.entity"

export class CreateMemoryCapsuleDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsObject()
  content: Record<string, any>

  @IsEnum(CapsuleType)
  type: CapsuleType

  @IsString()
  userId: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxUnlockAttempts?: number

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
