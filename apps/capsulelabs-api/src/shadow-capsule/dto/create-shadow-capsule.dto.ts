import { IsString, IsOptional, IsEnum, IsDateString, IsObject, IsNumber, Min, Max } from "class-validator"
import { ShadowCapsuleType } from "../entities/shadow-capsule.entity"

export class CreateShadowCapsuleDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsObject()
  content: Record<string, any>

  @IsEnum(ShadowCapsuleType)
  type: ShadowCapsuleType

  @IsString()
  userId: string

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
