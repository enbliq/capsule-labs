import { IsUUID } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class StartCountdownDto {
  @ApiProperty({
    description: "UUID of the countdown capsule to start",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  capsuleId: string
}
