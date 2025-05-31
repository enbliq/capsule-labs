import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsNumber, Min, Max } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreateVoiceLockCapsuleDto {
  @ApiProperty({ description: "Title of the voice lock capsule" })
  @IsNotEmpty()
  @IsString()
  title: string

  @ApiProperty({ description: "Content of the voice lock capsule" })
  @IsNotEmpty()
  @IsString()
  content: string

  @ApiProperty({ description: "Passphrase that must be spoken to unlock the capsule" })
  @IsNotEmpty()
  @IsString()
  passphrase: string

  @ApiProperty({ description: "Base64 encoded audio sample of the user's voice saying the passphrase" })
  @IsNotEmpty()
  @IsString()
  voiceSample: string

  @ApiProperty({ description: "Whether the passphrase matching is case sensitive", default: false })
  @IsOptional()
  @IsBoolean()
  caseSensitive?: boolean

  @ApiProperty({ description: "Confidence threshold for voice recognition (0.0 to 1.0)", default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number
}
