import { IsString, IsOptional, MinLength, MaxLength } from "class-validator"

export class CreateReflectionDto {
  @IsString()
  @MinLength(10, { message: "Reflection must be at least 10 characters long" })
  @MaxLength(2000, { message: "Reflection cannot exceed 2000 characters" })
  content: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  gratitudeNote?: string

  @IsOptional()
  @IsString()
  mood?: "very_happy" | "happy" | "neutral" | "sad" | "very_sad"

  @IsOptional()
  @IsString({ each: true })
  tags?: string[]
}

export class UpdateReflectionDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  content?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  gratitudeNote?: string

  @IsOptional()
  @IsString()
  mood?: "very_happy" | "happy" | "neutral" | "sad" | "very_sad"

  @IsOptional()
  @IsString({ each: true })
  tags?: string[]
}

export class ReflectionStatsDto {
  totalEntries: number
  currentStreak: number
  longestStreak: number
  averageWordCount: number
  moodDistribution: Record<string, number>
  capsuleUnlocked: boolean
  daysUntilUnlock: number
}
