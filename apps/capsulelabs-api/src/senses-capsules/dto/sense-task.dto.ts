import { IsEnum, IsString, IsOptional, IsObject } from "class-validator"

export enum SenseType {
  SIGHT = "sight",
  HEARING = "hearing",
  SMELL = "smell",
  TASTE = "taste",
  TOUCH = "touch",
}

export enum TaskType {
  QR_SCAN = "qr_scan",
  SOUND_RECORD = "sound_record",
  PHOTO_CAPTURE = "photo_capture",
  VOICE_COMMAND = "voice_command",
  GESTURE_DETECT = "gesture_detect",
  COLOR_IDENTIFY = "color_identify",
  PATTERN_MATCH = "pattern_match",
  VIBRATION_DETECT = "vibration_detect",
}

export class SenseTaskDto {
  @IsEnum(SenseType)
  sense: SenseType

  @IsEnum(TaskType)
  taskType: TaskType

  @IsString()
  title: string

  @IsString()
  description: string

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>
}

export class CompleteTaskDto {
  @IsString()
  taskId: string

  @IsObject()
  @IsOptional()
  taskData?: Record<string, any>
}
