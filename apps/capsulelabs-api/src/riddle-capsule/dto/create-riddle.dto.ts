import { IsString, IsOptional, IsEnum, IsObject, IsBoolean } from "class-validator"
import { RiddleCategory } from "../entities/riddle.entity"
import { RiddleDifficulty } from "../entities/riddle-capsule.entity"

export class CreateRiddleDto {
  @IsString()
  question: string

  @IsString()
  answer: string

  @IsOptional()
  @IsString()
  hint?: string

  @IsEnum(RiddleCategory)
  category: RiddleCategory

  @IsEnum(RiddleDifficulty)
  difficulty: RiddleDifficulty

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
