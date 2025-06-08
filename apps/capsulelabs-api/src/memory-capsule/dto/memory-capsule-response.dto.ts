import type { CapsuleStatus, CapsuleType } from "../entities/memory-capsule.entity"
import type { QuestionStatus, QuestionType } from "../entities/memory-question.entity"

export class MemoryCapsuleResponseDto {
  id: string
  title: string
  description?: string
  content?: Record<string, any>
  type: CapsuleType
  status: CapsuleStatus
  userId: string
  unlockedAt?: Date
  expiresAt?: Date
  unlockAttempts: number
  maxUnlockAttempts: number
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  currentQuestion?: MemoryQuestionResponseDto
}

export class MemoryQuestionResponseDto {
  id: string
  question: string
  type: QuestionType
  status: QuestionStatus
  answeredAt?: Date
  expiresAt?: Date
  createdAt: Date
}

export class UnlockAttemptResponseDto {
  success: boolean
  message: string
  capsule?: MemoryCapsuleResponseDto
  remainingAttempts?: number
}
