import { ApiProperty } from "@nestjs/swagger"

export class CountdownCapsuleResponseDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiProperty({ required: false })
  content?: string

  @ApiProperty()
  durationMinutes: number

  @ApiProperty({ required: false })
  unlockAt?: Date

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  started: boolean

  @ApiProperty()
  unlocked: boolean

  @ApiProperty()
  isExpired: boolean

  @ApiProperty()
  remainingTime: number

  @ApiProperty({ required: false })
  createdBy?: string
}
