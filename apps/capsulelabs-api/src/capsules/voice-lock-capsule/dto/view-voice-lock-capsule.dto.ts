import { ApiProperty } from "@nestjs/swagger"

export class ViewVoiceLockCapsuleDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiProperty({ required: false })
  content?: string

  @ApiProperty()
  isLocked: boolean

  @ApiProperty({ required: false })
  passphrase?: string

  @ApiProperty({ required: false })
  recognizedText?: string

  @ApiProperty({ required: false })
  confidenceScore?: number

  @ApiProperty({ required: false })
  voiceMatchScore?: number

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
