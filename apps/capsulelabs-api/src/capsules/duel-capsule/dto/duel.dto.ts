import { IsString, IsOptional, IsEnum, IsNotEmpty } from "class-validator"
import { TaskType } from "../interfaces/duel.interface"

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty()
  challengedUserId: string

  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType
}

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string

  @IsString()
  @IsNotEmpty()
  username: string
}

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  roomId: string

  @IsString()
  @IsNotEmpty()
  answer: string
}

export class ReadyDto {
  @IsString()
  @IsNotEmpty()
  roomId: string
}
