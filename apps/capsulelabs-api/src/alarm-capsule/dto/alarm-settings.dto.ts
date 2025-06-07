import { IsNumber, IsBoolean, IsOptional, Min, Max, IsString } from "class-validator"
import { Transform } from "class-transformer"

export class AlarmSettingsDto {
  @IsNumber()
  @Min(0)
  @Max(23)
  targetHour: number

  @IsNumber()
  @Min(0)
  @Max(59)
  targetMinute: number

  @IsNumber()
  @Min(1)
  @Max(60)
  @IsOptional()
  graceWindowMinutes?: number = 10

  @IsNumber()
  @Min(1)
  @Max(30)
  @IsOptional()
  requiredStreak?: number = 3

  @IsBoolean()
  @IsOptional()
  enablePushNotifications?: boolean = true

  @IsString()
  @IsOptional()
  timezone?: string = "UTC"
}

export class WakeUpLogDto {
  @Transform(({ value }) => new Date(value))
  wakeUpTime: Date

  @IsOptional()
  @IsString()
  method?: "alarm" | "manual" | "notification"
}

export class AlarmResponseDto {
  @IsString()
  action: "snooze" | "dismiss" | "late_response"

  @Transform(({ value }) => new Date(value))
  responseTime: Date
}
