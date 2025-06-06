import { IsString, IsInt, IsOptional, Min, Max, IsNotEmpty } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreateCountdownCapsuleDto {
  @ApiProperty({
    description: "Title of the countdown capsule",
    example: "My Secret Message",
  })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({
    description: "Content to be revealed after countdown",
    example: "This is the secret content that will be revealed!",
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string

  @ApiProperty({
    description: "Duration in minutes before the capsule unlocks",
    example: 60,
    minimum: 1,
    maximum: 525600, // 1 year in minutes
  })
  @IsInt()
  @Min(1)
  @Max(525600) // Max 1 year
  durationMinutes: number

  @ApiProperty({
    description: "Creator identifier",
    example: "user123",
    required: false,
  })
  @IsString()
  @IsOptional()
  createdBy?: string
}
