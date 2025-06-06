import { IsNumber, IsEnum, Min, Max } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { EmotionType } from "../enums/emotion-type.enum"

export class SubmitEmotionDto {
  @ApiProperty({
    description: "Detected emotion",
    enum: EmotionType,
    example: EmotionType.HAPPY,
  })
  @IsEnum(EmotionType)
  emotion: EmotionType

  @ApiProperty({
    description: "Confidence level of the emotion detection (0-1)",
    example: 0.92,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number
}
