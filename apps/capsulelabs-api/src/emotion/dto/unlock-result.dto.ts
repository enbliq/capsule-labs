import { ApiProperty } from "@nestjs/swagger"

export class UnlockResultDto {
  @ApiProperty()
  success: boolean

  @ApiProperty()
  message: string

  @ApiProperty({ required: false })
  content?: string

  @ApiProperty()
  unlocked: boolean

  @ApiProperty({ required: false })
  emotionMatch?: boolean

  @ApiProperty({ required: false })
  confidenceMatch?: boolean

  @ApiProperty({ required: false })
  requiredConfidence?: number

  @ApiProperty({ required: false })
  providedConfidence?: number

  @ApiProperty({ required: false })
  attemptsCount?: number
}
