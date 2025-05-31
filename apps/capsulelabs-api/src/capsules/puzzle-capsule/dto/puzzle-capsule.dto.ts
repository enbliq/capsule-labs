import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  IsNotEmpty,
  Min,
  Max,
  ValidateNested,
  IsInt,
  IsDateString,
} from "class-validator"
import { Type } from "class-transformer"
import { PuzzleType, PuzzleDifficulty, CipherType, LogicGateType } from "../entities/puzzle-capsule.entity"

export class CreatePuzzleCapsuleDto {
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

  @IsEnum(PuzzleType)
  puzzleType: PuzzleType

  @IsEnum(PuzzleDifficulty)
  difficulty: PuzzleDifficulty

  @IsObject()
  puzzleConfig: any // Will be validated by specific puzzle services

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsBoolean()
  hintsEnabled?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxHints?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  hintPenalty?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  retryDelay?: number
}

export class SubmitPuzzleDto {
  @IsString()
  @IsNotEmpty()
  puzzleId: string

  @IsString()
  @IsNotEmpty()
  userId: string

  @IsObject()
  solution: any // Type depends on puzzle type

  @IsOptional()
  @IsInt()
  @Min(0)
  timeTaken?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  hintsUsed?: number
}

export class GetHintDto {
  @IsString()
  @IsNotEmpty()
  puzzleId: string

  @IsString()
  @IsNotEmpty()
  userId: string

  @IsInt()
  @Min(1)
  hintNumber: number
}

export class SudokuConfigDto {
  @IsArray()
  @IsArray({ each: true })
  @IsInt({ each: true })
  grid: number[][]

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(3600)
  timeLimit?: number
}

export class CipherConfigDto {
  @IsEnum(CipherType)
  cipherType: CipherType

  @IsString()
  @IsNotEmpty()
  encryptedText: string

  @IsOptional()
  @IsString()
  key?: string

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(3600)
  timeLimit?: number
}

export class LogicGateConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LogicGateDto)
  gates: LogicGateDto[]

  @IsArray()
  @IsBoolean({ each: true })
  inputs: boolean[]

  @IsArray()
  @IsBoolean({ each: true })
  expectedOutput: boolean[]
}

export class LogicGateDto {
  @IsString()
  @IsNotEmpty()
  id: string

  @IsEnum(LogicGateType)
  type: LogicGateType

  @IsArray()
  @IsString({ each: true })
  inputs: string[]

  @IsString()
  @IsNotEmpty()
  output: string
}

export class MathPuzzleConfigDto {
  @IsString()
  @IsNotEmpty()
  equation: string

  @IsObject()
  variables: Record<string, number>

  @IsNumber()
  targetValue: number

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(3600)
  timeLimit?: number
}

export class WordPuzzleConfigDto {
  @IsArray()
  @IsString({ each: true })
  words: string[]

  @IsArray()
  @IsString({ each: true })
  clues: string[]

  @IsObject()
  gridSize: { rows: number; cols: number }

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  timeLimit?: number
}

export class PuzzleQueryDto {
  @IsOptional()
  @IsString()
  createdBy?: string

  @IsOptional()
  @IsEnum(PuzzleType)
  puzzleType?: PuzzleType

  @IsOptional()
  @IsEnum(PuzzleDifficulty)
  difficulty?: PuzzleDifficulty

  @IsOptional()
  @IsBoolean()
  solved?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number
}

export class UpdatePuzzleCapsuleDto {
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
  @IsBoolean()
  hintsEnabled?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxHints?: number
}
