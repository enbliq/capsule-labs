import { IsUUID, IsNumber, IsOptional, IsDateString } from "class-validator"

export class GPSUpdateDto {
  @IsUUID()
  attemptId: string

  @IsNumber()
  latitude: number

  @IsNumber()
  longitude: number

  @IsOptional()
  @IsNumber()
  altitude?: number

  @IsOptional()
  @IsNumber()
  accuracy?: number

  @IsOptional()
  @IsNumber()
  speed?: number

  @IsOptional()
  @IsNumber()
  bearing?: number

  @IsOptional()
  @IsDateString()
  timestamp?: string
}
