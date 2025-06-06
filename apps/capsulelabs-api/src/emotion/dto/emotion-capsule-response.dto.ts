import { ApiProperty } from "@nestjs/swagger"
import { EmotionType } from "../enums/emotion-type.enum"

export class EmotionCapsuleResponseDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiProperty({ required: false })
  content?: string

  @ApiProperty({ required: false })
  userId?: string

  @ApiProperty({ enum: EmotionType })
  targetEmotion: EmotionType

  @ApiProperty()
  detectionConfidence: number

  @ApiProperty()
  unlocked: boolean

  @ApiProperty()
  unlockAttempts: number

  @ApiProperty({ required: false })
  lastUnlockAttempt?: Date

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
