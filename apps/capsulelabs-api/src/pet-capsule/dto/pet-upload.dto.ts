import { IsString, IsOptional, IsEnum, IsArray, IsNumber, Min, Max } from "class-validator"

export enum PetType {
  DOG = "dog",
  CAT = "cat",
  BIRD = "bird",
  RABBIT = "rabbit",
  HAMSTER = "hamster",
  FISH = "fish",
  REPTILE = "reptile",
  OTHER = "other",
}

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  NEEDS_REVIEW = "needs_review",
}

export class PetUploadDto {
  @IsOptional()
  @IsString()
  petName?: string

  @IsOptional()
  @IsEnum(PetType)
  expectedPetType?: PetType

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}

export class ManualVerificationDto {
  @IsString()
  uploadId: string

  @IsEnum(VerificationStatus)
  status: VerificationStatus

  @IsOptional()
  @IsString()
  reviewNotes?: string

  @IsOptional()
  @IsEnum(PetType)
  correctedPetType?: PetType

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceOverride?: number
}

export class PetClassificationDto {
  petType: PetType
  confidence: number
  alternativePredictions: Array<{
    petType: PetType
    confidence: number
  }>
  processingTime: number
  modelVersion: string
}
