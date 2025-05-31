import { ApiProperty } from "@nestjs/swagger"
import { QuestionType } from "../entities/truth-question.entity"

export class QuestionDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  questionText: string

  @ApiProperty({ enum: QuestionType })
  type: QuestionType

  @ApiProperty()
  orderIndex: number

  @ApiProperty()
  weight: number
}

export class ViewTruthCapsuleDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiProperty({ required: false })
  content?: string

  @ApiProperty()
  isLocked: boolean

  @ApiProperty()
  truthThreshold: number

  @ApiProperty()
  maxAttempts: number

  @ApiProperty()
  attemptCount: number

  @ApiProperty({ type: [QuestionDto], required: false })
  questions?: QuestionDto[]

  @ApiProperty({ required: false })
  overallTruthScore?: number

  @ApiProperty({ required: false })
  sessionId?: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
