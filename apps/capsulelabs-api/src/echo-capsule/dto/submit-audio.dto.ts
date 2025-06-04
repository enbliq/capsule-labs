import { IsUUID, IsOptional, IsString, IsEnum } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { AudioFormat } from "../enums/sound-pattern.enum"
import { SoundPattern } from "../enums/sound-pattern.enum"

export class SubmitAudioDto {
  @ApiProperty({
    description: "ID of the echo capsule to attempt unlock",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  capsuleId: string

  @ApiPropertyOptional({
    description: "Audio format of the submitted file",
    enum: AudioFormat,
    example: AudioFormat.WAV,
  })
  @IsOptional()
  @IsEnum(AudioFormat)
  audioFormat?: AudioFormat

  @ApiPropertyOptional({
    description: "Additional metadata about the audio submission",
    example: "Recorded with iPhone microphone",
  })
  @IsOptional()
  @IsString()
  metadata?: string
}

export class AudioAnalysisResult {
  @ApiProperty({
    description: "Whether the target sound was detected",
    example: true,
  })
  detected: boolean

  @ApiProperty({
    description: "Confidence score of the detection (0.0 - 1.0)",
    example: 0.92,
  })
  confidence: number

  @ApiProperty({
    description: "Type of sound that was detected",
    enum: SoundPattern,
    example: SoundPattern.WHISTLE,
  })
  detectedPattern: SoundPattern | null

  @ApiProperty({
    description: "Whether the capsule was unlocked",
    example: true,
  })
  unlocked: boolean

  @ApiProperty({
    description: "Detailed analysis information",
    example: {
      duration: 2.5,
      sampleRate: 44100,
      channels: 1,
      features: {
        spectralCentroid: 2500.5,
        mfcc: [1.2, -0.8, 0.3],
        zcr: 0.15,
      },
    },
  })
  analysis: any
}
