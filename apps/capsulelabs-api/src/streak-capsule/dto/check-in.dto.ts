import { IsOptional, IsString, IsObject } from "class-validator"

export class CheckInDto {
  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
