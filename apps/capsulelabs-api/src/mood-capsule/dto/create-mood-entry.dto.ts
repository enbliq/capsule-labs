import { IsEnum, IsNotEmpty, IsString, IsUUID, IsOptional } from "class-validator"
import { MoodType } from "../entities/mood-entry.entity"

export class CreateMoodEntryDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string

  @IsEnum(MoodType)
  @IsNotEmpty()
  type: MoodType

  @IsString()
  @IsNotEmpty()
  content: string

  @IsOptional()
  metadata?: Record<string, any>
}
