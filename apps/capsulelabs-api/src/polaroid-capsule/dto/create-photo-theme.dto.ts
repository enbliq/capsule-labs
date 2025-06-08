import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsObject } from "class-validator"
import { ThemeCategory } from "../entities/photo-theme.entity"

export class CreatePhotoThemeDto {
  @IsString()
  name: string

  @IsString()
  description: string

  @IsEnum(ThemeCategory)
  category: ThemeCategory

  @IsArray()
  keywords: string[]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
