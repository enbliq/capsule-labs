import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, Min, Max, IsNotEmpty } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class CreateTypingTestDto {
  @ApiProperty({ description: "User ID" })
  @IsString()
  @IsNotEmpty()
  userId: string

  @ApiPropertyOptional({ description: "Test duration in milliseconds", default: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(10000)
  @Max(300000)
  duration?: number

  @ApiPropertyOptional({ description: "Minimum WPM required", default: 40 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  minWpm?: number

  @ApiPropertyOptional({ description: "Minimum accuracy percentage required", default: 90 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(100)
  minAccuracy?: number

  @ApiPropertyOptional({ description: "Test difficulty level", enum: ["easy", "medium", "hard"], default: "medium" })
  @IsOptional()
  @IsEnum(["easy", "medium", "hard"])
  difficulty?: "easy" | "medium" | "hard"

  @ApiPropertyOptional({ description: "Include numbers in test text", default: false })
  @IsOptional()
  @IsBoolean()
  includeNumbers?: boolean

  @ApiPropertyOptional({ description: "Include punctuation in test text", default: true })
  @IsOptional()
  @IsBoolean()
  includePunctuation?: boolean

  @ApiPropertyOptional({ description: "Include capital letters in test text", default: true })
  @IsOptional()
  @IsBoolean()
  includeCapitals?: boolean
}

export class StartTypingTestDto {
  @ApiProperty({ description: "User ID" })
  @IsString()
  @IsNotEmpty()
  userId: string
}

export class SubmitTypingTestDto {
  @ApiProperty({ description: "User ID" })
  @IsString()
  @IsNotEmpty()
  userId: string

  @ApiProperty({ description: "User typed text" })
  @IsString()
  @IsNotEmpty()
  userInput: string
}

export class TypingTestSessionDto {
  @ApiProperty({ description: "Session ID" })
  sessionId: string

  @ApiProperty({ description: "Text to type" })
  text: string

  @ApiProperty({ description: "Test duration in milliseconds" })
  duration: number

  @ApiProperty({ description: "Minimum WPM required" })
  minWpm: number

  @ApiProperty({ description: "Minimum accuracy percentage required" })
  minAccuracy: number

  @ApiProperty({ description: "Test difficulty level" })
  difficulty: "easy" | "medium" | "hard"

  @ApiProperty({ description: "Session status" })
  status: "created" | "started" | "completed" | "failed" | "expired"

  @ApiPropertyOptional({ description: "Session start time" })
  startTime?: Date

  @ApiPropertyOptional({ description: "Session end time" })
  endTime?: Date

  @ApiPropertyOptional({ description: "Words per minute achieved" })
  wpm?: number

  @ApiPropertyOptional({ description: "Accuracy percentage achieved" })
  accuracy?: number

  @ApiPropertyOptional({ description: "Number of errors made" })
  errors?: number

  @ApiPropertyOptional({ description: "Time elapsed in milliseconds" })
  timeElapsed?: number

  @ApiProperty({ description: "Session expiration time" })
  expiresAt: Date
}

export class TypingTestResultDto {
  @ApiProperty({ description: "Session ID" })
  sessionId: string

  @ApiProperty({ description: "Whether the challenge was successful" })
  success: boolean

  @ApiProperty({ description: "Words per minute achieved" })
  wpm: number

  @ApiProperty({ description: "Accuracy percentage achieved" })
  accuracy: number

  @ApiProperty({ description: "Number of errors made" })
  errors: number

  @ApiProperty({ description: "Number of correct characters" })
  correctChars: number

  @ApiProperty({ description: "Total characters typed" })
  totalChars: number

  @ApiProperty({ description: "Time elapsed in milliseconds" })
  timeElapsed: number

  @ApiProperty({ description: "Required WPM to pass" })
  requiredWpm: number

  @ApiProperty({ description: "Required accuracy to pass" })
  requiredAccuracy: number

  @ApiProperty({ description: "Completion timestamp" })
  completedAt: Date
}

export class TypingTestStatisticsDto {
  @ApiProperty({ description: "Total number of typing test sessions" })
  totalSessions: number

  @ApiProperty({ description: "Number of completed sessions" })
  completedSessions: number

  @ApiProperty({ description: "Number of failed sessions" })
  failedSessions: number

  @ApiProperty({ description: "Success rate percentage" })
  successRate: number

  @ApiProperty({ description: "Average words per minute" })
  averageWpm: number

  @ApiProperty({ description: "Best words per minute achieved" })
  bestWpm: number

  @ApiProperty({ description: "Average accuracy percentage" })
  averageAccuracy: number

  @ApiProperty({ description: "Best accuracy percentage achieved" })
  bestAccuracy: number

  @ApiProperty({ description: "Total typing time in milliseconds" })
  totalTypingTime: number

  @ApiProperty({ description: "Current streak of successful sessions" })
  currentStreak: number

  @ApiProperty({ description: "Best streak of successful sessions" })
  bestStreak: number
}
