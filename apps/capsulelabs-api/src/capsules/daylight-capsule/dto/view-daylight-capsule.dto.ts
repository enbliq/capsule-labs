import { ApiProperty } from "@nestjs/swagger"

export class ViewDaylightCapsuleDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiProperty({ required: false })
  content?: string

  @ApiProperty()
  isLocked: boolean

  @ApiProperty({ required: false })
  sunrise?: string

  @ApiProperty({ required: false })
  sunset?: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
