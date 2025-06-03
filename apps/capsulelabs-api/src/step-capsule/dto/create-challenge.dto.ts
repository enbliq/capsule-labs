import { IsString, IsNotEmpty, IsInt, IsNumber, IsEnum, IsArray, IsOptional, Min, Max } from "class-validator"
import { ChallengeDifficulty } from "../entities/step-challenge.entity"

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsOptional()
  description?: string

  @IsInt()
  @Min(100)
  stepGoal: number

  @IsNumber()
  @Min(0.1)
  distanceKm: number

  @IsEnum(ChallengeDifficulty)
  difficulty: ChallengeDifficulty

  @IsArray()
  routePoints: Array<{
    latitude: number
    longitude: number
    order: number
    isCheckpoint?: boolean
    name?: string
  }>

  @IsInt()
  @Min(10)
  @Max(200)
  @IsOptional()
  routeToleranceMeters?: number = 50

  @IsInt()
  @Min(300)
  @Max(14400)
  @IsOptional()
  timeLimit?: number = 3600

  @IsInt()
  @Min(10)
  @Max(1000)
  @IsOptional()
  rewardAmount?: number = 100

  @IsOptional()
  metadata?: Record<string, any>
}
