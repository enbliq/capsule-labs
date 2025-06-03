import { IsUUID, IsNotEmpty, IsOptional, IsString } from "class-validator"

export class CompleteChallengeDto {
  @IsUUID()
  @IsNotEmpty()
  attemptId: string

  @IsUUID()
  @IsNotEmpty()
  userId: string

  @IsOptional()
  @IsString()
  walletAddress?: string

  @IsOptional()
  completionData?: Record<string, any>
}
