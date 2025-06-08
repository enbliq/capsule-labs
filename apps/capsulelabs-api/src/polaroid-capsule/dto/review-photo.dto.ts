import { IsString, IsOptional, IsEnum, IsObject } from "class-validator"
import { SubmissionStatus } from "../entities/photo-submission.entity"

export class ReviewPhotoDto {
  @IsEnum(SubmissionStatus)
  status: SubmissionStatus

  @IsOptional()
  @IsString()
  rejectionReason?: string

  @IsString()
  reviewedBy: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
