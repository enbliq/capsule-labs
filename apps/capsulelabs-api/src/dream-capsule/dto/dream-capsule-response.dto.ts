import type { DreamCapsuleStatus, DreamCapsuleType } from "../entities/dream-capsule.entity"
import type { DreamClarity, DreamEmotion } from "../entities/dream-log.entity"

export class DreamLogResponseDto {
  id: string
  content: string
  wordCount: number
  title?: string
  clarity?: DreamClarity
  emotion?: DreamEmotion
  isLucid: boolean
  timezone: string
  isBeforeCutoff: boolean
  createdAt: Date
  logDate: Date
}

export class DreamCapsuleResponseDto {
  id: string
  title: string
  description?: string
  content?: Record<string, any>
  type: DreamCapsuleType
  status: DreamCapsuleStatus
  userId: string
  minimumWordCount: number
  cutoffTime: string
  timezone: string
  unlockedAt?: Date
  expiresAt?: Date
  unlockedByDreamLogId?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  canUnlockToday: boolean
  todaysDreamLog?: DreamLogResponseDto
}

export class LogDreamResponseDto {
  success: boolean
  message: string
  dreamLog: DreamLogResponseDto
  capsuleUnlocked: boolean
  unlockedCapsule?: DreamCapsuleResponseDto
}
