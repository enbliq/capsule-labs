import { ApiProperty } from "@nestjs/swagger"

export class ViewHeartbeatCapsuleDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiProperty({ required: false })
  content?: string

  @ApiProperty()
  isLocked: boolean

  @ApiProperty()
  targetMinBpm: number

  @ApiProperty()
  targetMaxBpm: number

  @ApiProperty({ required: false })
  submittedBpm?: number

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
