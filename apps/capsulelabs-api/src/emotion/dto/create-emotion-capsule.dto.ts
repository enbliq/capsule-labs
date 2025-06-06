import { IsString, IsEnum, IsNumber, IsOptional, Min, Max, IsNotEmpty } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { EmotionType } from "../enums/emotion-type.enum"

export class CreateEmotionCapsuleDto {
  @ApiProperty({
    description: "Title of the emotion capsule",
    example: "Happy Birthday Message",
  })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({
    description: "Content to be revealed when emotion is detected",
    example: "Surprise! Happy birthday to you!",
  })
  @IsString()
  @IsNotEmpty()
  content: string

  @ApiProperty({
    description: "User ID of the creator",
    example: "user123",
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string

  @ApiProperty({
    description: "Target emotion required to unlock the capsule",
    enum: EmotionType,
    example: EmotionType.HAPPY,
  })
  @IsEnum(EmotionType)
  targetEmotion: EmotionType

  @ApiProperty({
    description: "Minimum confidence level required for emotion detection (0-1)",
    example: 0.8,
    minimum: 0,
    maximum: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  detectionConfidence?: number
}
