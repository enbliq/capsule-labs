import { IsString, IsOptional, IsEnum, IsDateString, IsArray } from "class-validator"
import { MoodType } from "../entities/daily-log.entity"

export class CreateDailyLogDto {
  @IsString()
  userId: string

  @IsDateString()
  logDate: string

  @IsOptional()
  @IsEnum(MoodType)
  mood?: MoodType

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  activities?: string[]

  @IsOptional()
  metadata?: Record<string, any>
}
