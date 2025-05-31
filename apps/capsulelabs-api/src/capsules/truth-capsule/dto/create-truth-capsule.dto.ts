import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max, IsArray, ValidateNested } from "class-validator"
import { Type } from "class-transformer"
import { ApiProperty } from "@nestjs/swagger"
import { QuestionType } from "../entities/truth-question.entity"

export class CreateQuestionDto {
  @ApiProperty({ description: "The question text" })
  @IsNotEmpty()
  @IsString()
  questionText: string

  @ApiProperty({ description: "Type of question", enum: QuestionType })
  @IsOptional()
  type?: QuestionType

  @ApiProperty({ description: "Expected answer pattern for validation", required: false })
  @IsOptional()
  @IsString()
  expectedAnswerPattern?: string

  @ApiProperty({ description: "Weight of this question in the overall score", default: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(2.0)
  weight?: number
}

export class CreateTruthCapsuleDto {
  @ApiProperty({ description: "Title of the truth capsule" })
  @IsNotEmpty()
  @IsString()
  title: string

  @ApiProperty({ description: "Content of the truth capsule" })
  @IsNotEmpty()
  @IsString()
  content: string

  @ApiProperty({ description: "Truth threshold for unlocking (0.0 to 1.0)", default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  truthThreshold?: number

  @ApiProperty({ description: "Maximum number of attempts allowed", default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxAttempts?: number

  @ApiProperty({ description: "Questions for truth verification", type: [CreateQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[]
}
