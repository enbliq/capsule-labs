import type { RiddleCapsuleStatus, RiddleCapsuleType, RiddleDifficulty } from "../entities/riddle-capsule.entity"
import type { RiddleCategory } from "../entities/riddle.entity"

export class RiddleResponseDto {
  id: string
  question: string
  hint?: string
  category: RiddleCategory
  difficulty: RiddleDifficulty
}

export class RiddleCapsuleResponseDto {
  id: string
  title: string
  description?: string
  content?: Record<string, any>
  type: RiddleCapsuleType
  status: RiddleCapsuleStatus
  userId: string
  preferredDifficulty: RiddleDifficulty
  unlockedAt?: Date
  expiresAt?: Date
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  currentRiddle?: RiddleResponseDto
  nextAttemptAllowedAt?: Date
}

export class RiddleAttemptResponseDto {
  success: boolean
  message: string
  isCorrect: boolean
  similarityScore?: number
  capsule?: RiddleCapsuleResponseDto
  nextAttemptAllowedAt?: Date
}
