import type { ShadowCapsuleStatus, ShadowCapsuleType } from "../entities/shadow-capsule.entity"

export class ShadowCapsuleResponseDto {
  id: string
  title: string
  description?: string
  content?: Record<string, any>
  type: ShadowCapsuleType
  status: ShadowCapsuleStatus
  userId: string
  latitude: number
  longitude: number
  lastTwilightStart?: Date
  lastTwilightEnd?: Date
  nextTwilightStart?: Date
  nextTwilightEnd?: Date
  unlockedAt?: Date
  expiresAt?: Date
  isCurrentlyUnlockable: boolean
  timeUntilUnlockable?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export class UnlockAttemptResponseDto {
  success: boolean
  message: string
  capsule?: ShadowCapsuleResponseDto
}
