import { IsString, IsOptional, IsEnum, IsDateString, IsObject, IsNumber, Min, Max } from "class-validator"
import { PolaroidCapsuleType, ValidationMethod } from "../entities/polaroid-capsule.entity"

export class CreatePolaroidCapsuleDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsObject()
  content: Record<string, any>

  @IsEnum(PolaroidCapsuleType)
  type: PolaroidCapsuleType

  @IsString()
  userId: string

  @IsOptional()
  @IsEnum(ValidationMethod)
  validationMethod?: ValidationMethod

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  confidenceThreshold?: number

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
