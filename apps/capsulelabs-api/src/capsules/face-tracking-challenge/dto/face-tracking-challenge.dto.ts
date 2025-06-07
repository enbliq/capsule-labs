import { ApiProperty } from "@nestjs/swagger"
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from "class-validator"
import { Type } from "class-transformer"

export class CreateSessionDto {
  @ApiProperty({ description: "User ID", example: "user-123" })
  @IsString()
  @IsNotEmpty()
  userId: string

  @ApiProperty({ description: "Custom session settings", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FaceTrackingSettingsDto)
  settings?: FaceTrackingSettingsDto
}

export class FaceTrackingSettingsDto {
  @ApiProperty({ description: "Required tracking duration in milliseconds", example: 10000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1000) // Minimum 1 second
  @Max(60000) // Maximum 1 minute
  requiredDuration?: number

  @ApiProperty({ description: "Center tolerance (0-1)", example: 0.2, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(0.5)
  centerTolerance?: number

  @ApiProperty({ description: "Minimum confidence (0-1)", example: 0.7, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  minConfidence?: number

  @ApiProperty({ description: "Maximum rotation in degrees", example: 15, required: false })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(45)
  maxRotation?: number

  @ApiProperty({ description: "Minimum face size (0-1)", example: 0.1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(0.5)
  minFaceSize?: number

  @ApiProperty({ description: "Maximum face size (0-1)", example: 0.8, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.3)
  @Max(1.0)
  maxFaceSize?: number

  @ApiProperty({ description: "Allow multiple faces", example: false, required: false })
  @IsOptional()
  @IsBoolean()
  allowMultipleFaces?: boolean

  @ApiProperty({ description: "Stability threshold in milliseconds", example: 1000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(5000)
  stabilityThreshold?: number

  @ApiProperty({ description: "Max violation duration in milliseconds", example: 2000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(10000)
  maxViolationDuration?: number

  @ApiProperty({ description: "Tracking frequency in Hz", example: 10, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  trackingFrequency?: number
}

export class FacePositionDto {
  @ApiProperty({ description: "Center X coordinate (0-1)", example: 0.5 })
  @IsNumber()
  @Min(0)
  @Max(1)
  x: number

  @ApiProperty({ description: "Center Y coordinate (0-1)", example: 0.5 })
  @IsNumber()
  @Min(0)
  @Max(1)
  y: number

  @ApiProperty({ description: "Face width (0-1)", example: 0.3 })
  @IsNumber()
  @Min(0)
  @Max(1)
  width: number

  @ApiProperty({ description: "Face height (0-1)", example: 0.4 })
  @IsNumber()
  @Min(0)
  @Max(1)
  height: number

  @ApiProperty({ description: "Face rotation in degrees", example: 0 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  rotation: number

  @ApiProperty({ description: "Estimated distance (0-1)", example: 0.5 })
  @IsNumber()
  @Min(0)
  @Max(1)
  distance: number
}

export class FaceLandmarksDto {
  @ApiProperty({ description: "Left eye position" })
  @ValidateNested()
  @Type(() => PointDto)
  leftEye: PointDto

  @ApiProperty({ description: "Right eye position" })
  @ValidateNested()
  @Type(() => PointDto)
  rightEye: PointDto

  @ApiProperty({ description: "Nose position" })
  @ValidateNested()
  @Type(() => PointDto)
  nose: PointDto

  @ApiProperty({ description: "Mouth position" })
  @ValidateNested()
  @Type(() => PointDto)
  mouth: PointDto

  @ApiProperty({ description: "Left ear position", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PointDto)
  leftEar?: PointDto

  @ApiProperty({ description: "Right ear position", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PointDto)
  rightEar?: PointDto
}

export class PointDto {
  @ApiProperty({ description: "X coordinate (0-1)", example: 0.5 })
  @IsNumber()
  @Min(0)
  @Max(1)
  x: number

  @ApiProperty({ description: "Y coordinate (0-1)", example: 0.5 })
  @IsNumber()
  @Min(0)
  @Max(1)
  y: number
}

export class FaceDetectionDto {
  @ApiProperty({ description: "Detection confidence (0-1)", example: 0.95 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number

  @ApiProperty({ description: "Face position" })
  @ValidateNested()
  @Type(() => FacePositionDto)
  position: FacePositionDto

  @ApiProperty({ description: "Face landmarks", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FaceLandmarksDto)
  landmarks?: FaceLandmarksDto
}

export class ProcessDetectionDto {
  @ApiProperty({ description: "Array of face detections", type: [FaceDetectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaceDetectionDto)
  detections: FaceDetectionDto[]

  @ApiProperty({ description: "Detection timestamp", required: false })
  @IsOptional()
  @IsNumber()
  timestamp?: number
}
