import { IsNotEmpty, IsString, IsUUID, IsOptional, IsNumber, Min, Max } from "class-validator"

export class CreateCapsuleDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string

  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsNotEmpty()
  content: string

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  unlockThreshold?: number = 0.7 // Default consistency threshold

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(30)
  requiredDays?: number = 3
}
