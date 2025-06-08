import { IsString, IsOptional, IsObject } from "class-validator"

export class AnswerRiddleDto {
  @IsString()
  answer: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
