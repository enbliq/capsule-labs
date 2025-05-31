import { IsNotEmpty, IsString, IsArray, ValidateNested } from "class-validator"
import { Type } from "class-transformer"
import { ApiProperty } from "@nestjs/swagger"

export class AnswerDto {
  @ApiProperty({ description: "ID of the question being answered" })
  @IsNotEmpty()
  @IsString()
  questionId: string

  @ApiProperty({ description: "The user's answer to the question" })
  @IsNotEmpty()
  @IsString()
  answerText: string
}

export class SubmitAnswersDto {
  @ApiProperty({ description: "Array of answers to the truth questions", type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[]
}
