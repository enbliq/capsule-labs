import { IsUUID, IsOptional, IsDateString, IsInt, Min, Max } from "class-validator"

export class GetMoodHistoryDto {
  @IsUUID()
  userId: string

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50
}
