import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, Min, Max, IsNotEmpty } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class AudioAnalysisDto {
  @ApiProperty({ description: "Average decibel level", example: -25 })
  @IsNumber()
  averageDecibel: number

  @ApiProperty({ description: "Peak decibel level", example: -18 })
  @IsNumber()
  peakDecibel: number

  @ApiProperty({ description: "Audio duration in milliseconds", example: 3000 })
  @IsNumber()
  @Min(100)
  duration: number

  @ApiProperty({ description: "Audio frequency", example: 440 })
  @IsNumber()
  frequency: number

  @ApiProperty({ description: "Whether audio is at whisper level", example: true })
  @IsBoolean()
  isWhisperLevel: boolean

  @ApiProperty({ description: "Background noise floor level", example: -45 })
  @IsNumber()
  noiseFloor: number

  @ApiProperty({ description: "Whether speech was detected", example: true })
  @IsBoolean()
  speechDetected: boolean
}

export class SpeechAlternativeDto {
  @ApiProperty({ description: "Alternative transcript", example: "hello world" })
  @IsString()
  transcript: string

  @ApiProperty({ description: "Confidence score", example: 0.85 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number
}

export class SpeechRecognitionResultDto {
  @ApiProperty({ description: "Recognized transcript", example: "hello world" })
  @IsString()
  @IsNotEmpty()
  transcript: string

  @ApiProperty({ description: "Recognition confidence", example: 0.92 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number

  @ApiPropertyOptional({ description: "Alternative transcripts", type: [SpeechAlternativeDto] })
  @IsOptional()
  @IsArray()
  alternatives?: SpeechAlternativeDto[]

  @ApiProperty({ description: "Detected language", example: "en-US" })
  @IsString()
  language: string

  @ApiProperty({ description: "Whether result is final", example: true })
  @IsBoolean()
  isFinal: boolean
}

export class CreateWhisperSessionDto {
  @ApiProperty({ description: "User ID", example: "user-123" })
  @IsString()
  @IsNotEmpty()
  userId: string

  @ApiProperty({ description: "Password to whisper", example: "secret phrase" })
  @IsString()
  @IsNotEmpty()
  password: string

  @ApiPropertyOptional({ description: "Password hint", example: "Two words about secrecy" })
  @IsOptional()
  @IsString()
  passwordHint?: string

  @ApiPropertyOptional({ description: "Maximum decibel level for whisper", example: -20 })
  @IsOptional()
  @IsNumber()
  @Max(-10)
  maxDecibelLevel?: number

  @ApiPropertyOptional({ description: "Minimum decibel level for whisper", example: -60 })
  @IsOptional()
  @IsNumber()
  @Max(-30)
  minDecibelLevel?: number

  @ApiPropertyOptional({ description: "Minimum speech recognition confidence", example: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1)
  minConfidence?: number

  @ApiPropertyOptional({ description: "Maximum attempts allowed", example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxAttempts?: number

  @ApiPropertyOptional({ description: "Session expiry in milliseconds", example: 300000 })
  @IsOptional()
  @IsNumber()
  @Min(60000)
  sessionExpiry?: number

  @ApiPropertyOptional({ description: "Maximum audio duration in milliseconds", example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(30000)
  maxDuration?: number

  @ApiPropertyOptional({ description: "Minimum audio duration in milliseconds", example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(5000)
  minDuration?: number

  @ApiPropertyOptional({ description: "Allowed languages", example: ["en-US", "en-GB"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedLanguages?: string[]

  @ApiPropertyOptional({ description: "Require exact password match", example: true })
  @IsOptional()
  @IsBoolean()
  requireExactMatch?: boolean

  @ApiPropertyOptional({ description: "Case sensitive matching", example: false })
  @IsOptional()
  @IsBoolean()
  caseSensitive?: boolean

  @ApiPropertyOptional({ description: "Allow partial password match", example: false })
  @IsOptional()
  @IsBoolean()
  allowPartialMatch?: boolean

  @ApiPropertyOptional({ description: "Partial match threshold", example: 0.8 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(1)
  partialMatchThreshold?: number
}

export class ProcessWhisperAttemptDto {
  @ApiProperty({ description: "Audio analysis data", type: AudioAnalysisDto })
  audioAnalysis: AudioAnalysisDto

  @ApiProperty({ description: "Speech recognition result", type: SpeechRecognitionResultDto })
  speechResult: SpeechRecognitionResultDto
}

export class WhisperSessionSettingsDto {
  @ApiProperty({ description: "Maximum decibel level", example: -20 })
  maxDecibelLevel: number

  @ApiProperty({ description: "Minimum decibel level", example: -60 })
  minDecibelLevel: number

  @ApiProperty({ description: "Minimum confidence", example: 0.7 })
  minConfidence: number

  @ApiProperty({ description: "Maximum duration", example: 10000 })
  maxDuration: number

  @ApiProperty({ description: "Minimum duration", example: 1000 })
  minDuration: number

  @ApiProperty({ description: "Allowed languages", example: ["en-US"] })
  allowedLanguages: string[]

  @ApiProperty({ description: "Require exact match", example: true })
  requireExactMatch: boolean

  @ApiProperty({ description: "Case sensitive", example: false })
  caseSensitive: boolean

  @ApiProperty({ description: "Allow partial match", example: false })
  allowPartialMatch: boolean

  @ApiProperty({ description: "Partial match threshold", example: 0.8 })
  partialMatchThreshold: number
}

export class WhisperAttemptDto {
  @ApiProperty({ description: "Attempt ID", example: "attempt-123" })
  attemptId: string

  @ApiProperty({ description: "Attempt timestamp", example: 1640995200000 })
  timestamp: number

  @ApiProperty({ description: "Password match result", example: true })
  passwordMatch: boolean

  @ApiProperty({ description: "Volume validation result", example: true })
  volumeValid: boolean

  @ApiProperty({ description: "Overall success", example: true })
  success: boolean

  @ApiPropertyOptional({ description: "Failure reason", example: "Volume too loud" })
  failureReason?: string

  @ApiPropertyOptional({ description: "Audio analysis", type: AudioAnalysisDto })
  audioAnalysis?: AudioAnalysisDto

  @ApiPropertyOptional({ description: "Speech result", type: SpeechRecognitionResultDto })
  speechResult?: SpeechRecognitionResultDto
}

export class WhisperStatisticsDto {
  @ApiProperty({ description: "Total attempts", example: 3 })
  totalAttempts: number

  @ApiProperty({ description: "Average decibel level", example: -25.5 })
  averageDecibel: number

  @ApiProperty({ description: "Average confidence", example: 0.85 })
  averageConfidence: number

  @ApiPropertyOptional({ description: "Best attempt", type: WhisperAttemptDto })
  bestAttempt?: WhisperAttemptDto
}

export class WhisperSessionResponseDto {
  @ApiProperty({ description: "Session ID", example: "session-123" })
  sessionId: string

  @ApiProperty({ description: "User ID", example: "user-123" })
  userId: string

  @ApiPropertyOptional({ description: "Password hint", example: "Two words about secrecy" })
  passwordHint?: string

  @ApiProperty({ description: "Session status", example: "active" })
  status: string

  @ApiProperty({ description: "Creation timestamp", example: 1640995200000 })
  createdAt: number

  @ApiProperty({ description: "Expiration timestamp", example: 1640995500000 })
  expiresAt: number

  @ApiProperty({ description: "Maximum attempts", example: 5 })
  maxAttempts: number

  @ApiProperty({ description: "Remaining attempts", example: 3 })
  remainingAttempts: number

  @ApiProperty({ description: "Session settings", type: WhisperSessionSettingsDto })
  settings: WhisperSessionSettingsDto

  @ApiProperty({ description: "Whether capsule is unlocked", example: false })
  unlocked: boolean

  @ApiPropertyOptional({ description: "Completion timestamp", example: 1640995300000 })
  completedAt?: number

  @ApiPropertyOptional({ description: "Session attempts", type: [WhisperAttemptDto] })
  attempts?: WhisperAttemptDto[]

  @ApiPropertyOptional({ description: "Session statistics", type: WhisperStatisticsDto })
  statistics?: WhisperStatisticsDto

  @ApiProperty({ description: "Response message", example: "Session created successfully" })
  message: string
}

export class WhisperAttemptResponseDto {
  @ApiProperty({ description: "Attempt success", example: true })
  success: boolean

  @ApiProperty({ description: "Capsule unlocked", example: true })
  unlocked: boolean

  @ApiProperty({ description: "Response message", example: "Challenge completed!" })
  message: string

  @ApiProperty({ description: "Attempt details", type: WhisperAttemptDto })
  attempt: WhisperAttemptDto

  @ApiProperty({ description: "Updated session info" })
  session: {
    sessionId: string
    status: string
    remainingAttempts: number
    unlocked: boolean
    statistics: WhisperStatisticsDto
  }
}

export class WhisperSessionSummaryDto {
  @ApiProperty({ description: "Session ID", example: "session-123" })
  sessionId: string

  @ApiProperty({ description: "User ID", example: "user-123" })
  userId: string

  @ApiProperty({ description: "Session status", example: "completed" })
  status: string

  @ApiProperty({ description: "Creation timestamp", example: 1640995200000 })
  createdAt: number

  @ApiPropertyOptional({ description: "Completion timestamp", example: 1640995300000 })
  completedAt?: number

  @ApiProperty({ description: "Number of attempts", example: 2 })
  attempts: number

  @ApiProperty({ description: "Success status", example: true })
  success: boolean

  @ApiProperty({ description: "Average decibel level", example: -22.5 })
  averageDecibel: number

  @ApiProperty({ description: "Best confidence score", example: 0.92 })
  bestConfidence: number
}

export class WhisperUserStatisticsDto {
  @ApiProperty({ description: "Total sessions", example: 10 })
  totalSessions: number

  @ApiProperty({ description: "Completed sessions", example: 7 })
  completedSessions: number

  @ApiProperty({ description: "Failed sessions", example: 3 })
  failedSessions: number

  @ApiProperty({ description: "Success rate percentage", example: 70 })
  successRate: number

  @ApiProperty({ description: "Total attempts across all sessions", example: 25 })
  totalAttempts: number

  @ApiProperty({ description: "Average attempts per session", example: 2.5 })
  averageAttemptsPerSession: number

  @ApiProperty({ description: "Average decibel level", example: -23.2 })
  averageDecibel: number

  @ApiProperty({ description: "Average confidence score", example: 0.88 })
  averageConfidence: number

  @ApiPropertyOptional({ description: "Best session", type: WhisperSessionSummaryDto })
  bestSession?: WhisperSessionSummaryDto

  @ApiProperty({ description: "Current success streak", example: 3 })
  currentStreak: number
}
