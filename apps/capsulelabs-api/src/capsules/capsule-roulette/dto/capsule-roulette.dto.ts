import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsEnum, IsDateString, Min, Max } from "class-validator"
import type { RewardConfig, EligibilityCriteria, SpecialEventConfig } from "../entities/capsule-roulette.entity"
import { NotificationChannel } from "../entities/capsule-roulette.entity"

export class CreateRouletteDropDto {
  @IsString()
  title: string

  @IsString()
  description: string

  @IsDateString()
  @IsOptional()
  scheduledDropTime?: string

  @IsOptional()
  rewardConfig?: RewardConfig

  @IsOptional()
  eligibilityCriteria?: EligibilityCriteria

  @IsOptional()
  specialEvent?: SpecialEventConfig

  @IsString()
  createdBy: string
}

export class ClaimCapsuleDto {
  @IsString()
  capsuleDropId: string

  @IsString()
  userId: string

  @IsString()
  @IsOptional()
  userAgent?: string

  @IsString()
  @IsOptional()
  deviceFingerprint?: string

  @IsOptional()
  metadata?: any
}

export class UpdateRouletteDropDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsDateString()
  @IsOptional()
  scheduledDropTime?: string

  @IsOptional()
  rewardConfig?: Partial<RewardConfig>

  @IsOptional()
  eligibilityCriteria?: Partial<EligibilityCriteria>

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

export class RouletteQueryDto {
  @IsString()
  @IsOptional()
  status?: string

  @IsString()
  @IsOptional()
  userId?: string

  @IsDateString()
  @IsOptional()
  startDate?: string

  @IsDateString()
  @IsOptional()
  endDate?: string

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number

  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number

  @IsBoolean()
  @IsOptional()
  includeStats?: boolean
}

export class ScheduleDropDto {
  @IsDateString()
  @IsOptional()
  targetDate?: string

  @IsString()
  @IsOptional()
  timeWindow?: string // "06:00-23:00"

  @IsArray()
  @IsOptional()
  blackoutPeriods?: Array<{
    start: string
    end: string
    reason: string
  }>

  @IsOptional()
  specialEvent?: SpecialEventConfig

  @IsString()
  scheduledBy: string
}

export class NotificationConfigDto {
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[]

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetUserIds?: string[]

  @IsOptional()
  eligibilityCriteria?: EligibilityCriteria

  @IsString()
  @IsOptional()
  customMessage?: string

  @IsBoolean()
  @IsOptional()
  testMode?: boolean
}

export class ManualDropDto {
  @IsString()
  title: string

  @IsString()
  description: string

  @IsOptional()
  rewardConfig?: RewardConfig

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(3600)
  durationMinutes?: number

  @IsString()
  triggeredBy: string

  @IsString()
  @IsOptional()
  reason?: string
}

export class BulkClaimAnalysisDto {
  @IsString()
  capsuleDropId: string

  @IsArray()
  @IsString({ each: true })
  userIds: string[]

  @IsBoolean()
  @IsOptional()
  includeRiskAnalysis?: boolean

  @IsBoolean()
  @IsOptional()
  includeDeviceFingerprinting?: boolean
}

export class RewardDispatchDto {
  @IsString()
  claimEventId: string

  @IsString()
  userId: string

  @IsNumber()
  @Min(0)
  amount: number

  @IsString()
  currency: string

  @IsString()
  @IsOptional()
  walletAddress?: string

  @IsBoolean()
  @IsOptional()
  forceDispatch?: boolean
}

export class UserEligibilityDto {
  @IsString()
  userId: string

  @IsString()
  @IsOptional()
  capsuleDropId?: string

  @IsBoolean()
  @IsOptional()
  includeReasons?: boolean

  @IsBoolean()
  @IsOptional()
  includeStats?: boolean
}

export class RouletteStatsDto {
  @IsDateString()
  @IsOptional()
  startDate?: string

  @IsDateString()
  @IsOptional()
  endDate?: string

  @IsString()
  @IsOptional()
  userId?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  metrics?: string[]

  @IsString()
  @IsOptional()
  groupBy?: string // 'day' | 'week' | 'month'
}
