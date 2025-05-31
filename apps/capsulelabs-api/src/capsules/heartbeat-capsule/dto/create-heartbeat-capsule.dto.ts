import { IsNotEmpty, IsString, IsInt, Min, Max } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreateHeartbeatCapsuleDto {
  @ApiProperty({ description: "Title of the heartbeat capsule" })
  @IsNotEmpty()
  @IsString()
  title: string

  @ApiProperty({ description: "Content of the heartbeat capsule" })
  @IsNotEmpty()
  @IsString()
  content: string

  @ApiProperty({ description: "Minimum target BPM for unlocking the capsule", minimum: 30, maximum: 220 })
  @IsInt()
  @Min(30)
  @Max(220)
  targetMinBpm: number

  @ApiProperty({ description: "Maximum target BPM for unlocking the capsule", minimum: 30, maximum: 220 })
  @IsInt()
  @Min(30)
  @Max(220)
  targetMaxBpm: number
}
