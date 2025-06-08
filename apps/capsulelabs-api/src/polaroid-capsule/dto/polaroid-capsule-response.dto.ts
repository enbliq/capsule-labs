import type { PolaroidCapsuleStatus, PolaroidCapsuleType, ValidationMethod } from "../entities/polaroid-capsule.entity"
import type { ThemeCategory } from "../entities/photo-theme.entity"
import type { SubmissionStatus } from "../entities/photo-submission.entity"

export class PhotoThemeResponseDto {
  id: string
  name: string
  description: string
  category: ThemeCategory
  keywords: string[]
}

export class DailyThemeResponseDto {
  id: string
  date: Date
  theme: PhotoThemeResponseDto
}

export class PhotoSubmissionResponseDto {
  id: string
  photoUrl: string
  thumbnailUrl?: string
  caption?: string
  status: SubmissionStatus
  confidenceScore?: number
  rejectionReason?: string
  submittedAt: Date
  reviewedAt?: Date
  dailyTheme: DailyThemeResponseDto
}

export class PolaroidCapsuleResponseDto {
  id: string
  title: string
  description?: string
  content?: Record<string, any>
  type: PolaroidCapsuleType
  status: PolaroidCapsuleStatus
  userId: string
  validationMethod: ValidationMethod
  confidenceThreshold: number
  unlockedBySubmissionId?: string
  unlockedAt?: Date
  expiresAt?: Date
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  todaysTheme?: DailyThemeResponseDto
  todaysSubmission?: PhotoSubmissionResponseDto
}

export class SubmitPhotoResponseDto {
  success: boolean
  message: string
  submission: PhotoSubmissionResponseDto
  capsuleUnlocked: boolean
  unlockedCapsule?: PolaroidCapsuleResponseDto
}
