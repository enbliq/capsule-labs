import { IsString, IsArray, ArrayMinSize, ArrayMaxSize, IsOptional, IsNumber, Min, Max } from "class-validator"

export class TimeZoneSettingsDto {
  @IsArray()
  @ArrayMinSize(3, { message: "Must select at least 3 time zones" })
  @ArrayMaxSize(10, { message: "Cannot select more than 10 time zones" })
  @IsString({ each: true })
  timeZones: string[]

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  targetHour?: number
}

export class AccessAttemptDto {
  @IsString()
  timeZone: string

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  @IsString()
  deviceInfo?: string
}

export class TimeZoneValidationDto {
  timeZone: string
  isValid: boolean
  currentHour: number
  currentTime: string
  offset: string
}
