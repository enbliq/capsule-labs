import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber } from "class-validator"

export class CreateChallengeDto {
  @ApiProperty({ description: "User ID", example: "user-123" })
  @IsString()
  @IsNotEmpty()
  userId: string

  @ApiProperty({ description: "Trigger type", example: "visual", enum: ["sound", "visual"] })
  @IsString()
  @IsOptional()
  @IsIn(["sound", "visual"])
  triggerType?: "sound" | "visual"
}

export class ReactDto {
  @ApiProperty({ description: "Timestamp of the reaction in milliseconds", example: 1623456789123 })
  @IsNumber()
  @IsNotEmpty()
  timestamp: number
}
