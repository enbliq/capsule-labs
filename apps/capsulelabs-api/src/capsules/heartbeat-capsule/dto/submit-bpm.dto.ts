import { IsInt, Min, Max } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class SubmitBpmDto {
  @ApiProperty({ description: "Heart rate in beats per minute", minimum: 30, maximum: 220 })
  @IsInt()
  @Min(30)
  @Max(220)
  bpm: number
}
