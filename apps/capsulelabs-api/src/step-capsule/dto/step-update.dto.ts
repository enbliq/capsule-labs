import { IsUUID, IsInt, IsNumber, IsOptional, IsDateString } from "class-validator"

export class StepUpdateDto {
  @IsUUID()
  attemptId: string

  @IsInt()
  stepCount: number

  @IsInt()
  cumulativeSteps: number

  @IsOptional()
  @IsNumber()
  cadence?: number

  @IsOptional()
  @IsNumber()
  strideLength?: number

  @IsOptional()
  @IsDateString()
  timestamp?: string

  @IsOptional()
  deviceData?: Record<string, any>
}
