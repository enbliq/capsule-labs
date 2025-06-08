import { IsString, IsOptional, IsEnum, IsDateString, IsObject, IsBoolean, IsUUID } from "class-validator"
import { RiddleCapsuleType, RiddleDifficulty } from "../entities/riddle-capsule.entity"

export class CreateRiddleCapsuleDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsObject()
  content: Record<string, any>

  @IsEnum(RiddleCapsuleType)
  type: RiddleCapsuleType

  @IsString()
  userId: string

  @IsOptional()
  @IsEnum(RiddleDifficulty)
  preferredDifficulty?: RiddleDifficulty

  @IsOptional()
  @IsBoolean()
  useExternalApi?: boolean

  @IsOptional()
  @IsUUID()
  specificRiddleId?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
