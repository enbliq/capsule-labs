import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from "class-validator"
import { DreamClarity, DreamEmotion } from "../entities/dream-log.entity"

export class LogDreamDto {
  @IsString()
  content: string

  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsEnum(DreamClarity)
  clarity?: DreamClarity

  @IsOptional()
  @IsEnum(DreamEmotion)
  emotion?: DreamEmotion

  @IsOptional()
  @IsBoolean()
  isLucid?: boolean

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
