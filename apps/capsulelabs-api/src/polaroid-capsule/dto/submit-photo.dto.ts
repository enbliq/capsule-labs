import { IsString, IsOptional, IsObject } from "class-validator"

export class SubmitPhotoDto {
  @IsString()
  photoUrl: string

  @IsOptional()
  @IsString()
  thumbnailUrl?: string

  @IsOptional()
  @IsString()
  caption?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
