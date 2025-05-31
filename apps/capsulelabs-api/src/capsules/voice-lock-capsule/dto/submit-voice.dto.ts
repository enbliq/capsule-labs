import { IsNotEmpty, IsString } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class SubmitVoiceDto {
  @ApiProperty({ description: "Base64 encoded audio sample of the user speaking the passphrase" })
  @IsNotEmpty()
  @IsString()
  voiceSample: string
}
