import { ApiProperty } from "@nestjs/swagger"

export class UnlockResponseDto {
  @ApiProperty({
    description: "Whether the unlock attempt was successful",
    example: true,
  })
  success: boolean

  @ApiProperty({
    description: "Message describing the result",
    example: "Capsule unlocked successfully!",
  })
  message: string

  @ApiProperty({
    description: "Distance from the lock location in meters",
    example: 15.5,
  })
  distanceMeters: number

  @ApiProperty({
    description: "Content of the capsule (only if unlocked)",
    example: "Congratulations! You found the hidden treasure!",
    required: false,
  })
  content?: string

  @ApiProperty({
    description: "Title of the capsule (only if unlocked)",
    example: "Secret Message at Central Park",
    required: false,
  })
  title?: string
}
