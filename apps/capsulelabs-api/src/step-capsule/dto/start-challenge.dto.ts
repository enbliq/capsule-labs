import { IsUUID, IsNotEmpty, IsOptional, IsString } from "class-validator"

export class StartChallengeDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string

  @IsUUID()
  @IsNotEmpty()
  challengeId: string

  @IsOptional()
  @IsString()
  deviceId?: string

  @IsOptional()
  metadata?: Record<string, any>
}
