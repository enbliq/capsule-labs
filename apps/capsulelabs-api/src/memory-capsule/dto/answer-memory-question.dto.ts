import { IsString, IsObject, IsOptional } from "class-validator"

export class AnswerMemoryQuestionDto {
  @IsString()
  questionId: string

  @IsObject()
  answer: Record<string, any>

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
