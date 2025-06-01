import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsNotEmpty,
  Min,
  Max,
  ValidateNested,
  IsInt,
  IsDateString,
  Matches,
  IsUrl,
} from "class-validator"
import { Type } from "class-transformer"
import { TaskType, TaskOrder, VerificationMethod } from "../entities/time-loop-capsule.entity"

export class CreateTimeLoopCapsuleDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsString()
  @IsNotEmpty()
  reward: string

  @IsString()
  @IsNotEmpty()
  createdBy: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @ValidateNested()
  @Type(() => LoopConfigDto)
  loopConfig: LoopConfigDto

  @ValidateNested()
  @Type(() => TaskConfigDto)
  taskConfig: TaskConfigDto
}

export class LoopConfigDto {
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "dailyResetTime must be in HH:MM format",
  })
  dailyResetTime: string

  @IsString()
  @IsNotEmpty()
  timezone: string

  @IsInt()
  @Min(1)
  @Max(365)
  streakRequiredForPermanentUnlock: number

  @IsInt()
  @Min(1)
  @Max(48)
  gracePeriodHours: number

  @IsBoolean()
  allowMakeupTasks: boolean

  @IsInt()
  @Min(1)
  @Max(7)
  maxMissedDaysBeforeReset: number
}

export class TaskConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyTaskDto)
  dailyTasks: DailyTaskDto[]

  @IsEnum(TaskOrder)
  taskOrder: TaskOrder

  @IsBoolean()
  allowPartialCompletion: boolean

  @IsInt()
  @Min(1)
  minimumTasksRequired: number
}

export class DailyTaskDto {
  @IsString()
  @IsNotEmpty()
  id: string

  @IsEnum(TaskType)
  type: TaskType

  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  description: string

  @ValidateNested()
  @Type(() => TaskSpecificConfigDto)
  config: TaskSpecificConfigDto

  @IsInt()
  @Min(1)
  @Max(100)
  points: number

  @IsBoolean()
  isRequired: boolean

  @IsInt()
  @Min(1)
  @Max(120)
  estimatedMinutes: number
}

export class TaskSpecificConfigDto {
  // Steps task
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(50000)
  targetSteps?: number

  @IsOptional()
  @IsBoolean()
  allowManualEntry?: boolean

  // Quiz task
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions?: QuizQuestionDto[]

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number

  // Gratitude task
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1000)
  minimumCharacters?: number

  @IsOptional()
  @IsString()
  promptText?: string

  // Habit task
  @IsOptional()
  @IsString()
  habitName?: string

  @IsOptional()
  @IsEnum(VerificationMethod)
  verificationMethod?: VerificationMethod

  // Photo task
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredTags?: string[]

  @IsOptional()
  @IsBoolean()
  locationRequired?: boolean

  // Reading task
  @IsOptional()
  @IsUrl()
  articleUrl?: string

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(3600)
  minimumReadTime?: number

  // Meditation task
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  minimumDuration?: number

  @IsOptional()
  @IsBoolean()
  guidedSession?: boolean
}

export class QuizQuestionDto {
  @IsString()
  @IsNotEmpty()
  id: string

  @IsString()
  @IsNotEmpty()
  question: string

  @IsArray()
  @IsString({ each: true })
  options: string[]

  @IsInt()
  @Min(0)
  correctAnswer: number

  @IsOptional()
  @IsString()
  explanation?: string
}

export class SubmitTaskDto {
  @IsString()
  @IsNotEmpty()
  capsuleId: string

  @IsString()
  @IsNotEmpty()
  taskId: string

  @IsString()
  @IsNotEmpty()
  userId: string

  @IsNotEmpty()
  submissionData: any

  @IsOptional()
  deviceInfo?: any
}

export class GetUserProgressDto {
  @IsString()
  @IsNotEmpty()
  capsuleId: string

  @IsString()
  @IsNotEmpty()
  userId: string
}

export class UpdateTimeLoopCapsuleDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  reward?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @ValidateNested()
  @Type(() => LoopConfigDto)
  loopConfig?: LoopConfigDto

  @IsOptional()
  @ValidateNested()
  @Type(() => TaskConfigDto)
  taskConfig?: TaskConfigDto
}

export class TimeLoopQueryDto {
  @IsOptional()
  @IsString()
  createdBy?: string

  @IsOptional()
  @IsBoolean()
  permanentlyUnlocked?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number
}

export class ManualStateChangeDto {
  @IsString()
  @IsNotEmpty()
  capsuleId: string

  @IsString()
  @IsNotEmpty()
  newState: string

  @IsString()
  @IsNotEmpty()
  reason: string

  @IsOptional()
  @IsString()
  userId?: string
}

export class MakeupTaskDto {
  @IsString()
  @IsNotEmpty()
  capsuleId: string

  @IsString()
  @IsNotEmpty()
  userId: string

  @IsDateString()
  missedDate: string

  @IsString()
  @IsNotEmpty()
  taskId: string

  @IsNotEmpty()
  submissionData: any
}
