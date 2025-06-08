import type { StreakCapsuleStatus, StreakCapsuleType } from "../entities/streak-capsule.entity"

export class StreakCapsuleResponseDto {
  id: string
  title: string
  description?: string
  content?: Record<string, any>
  type: StreakCapsuleType
  status: StreakCapsuleStatus
  userId: string
  requiredStreakDays: number
  currentStreak: number
  longestStreak: number
  totalCheckIns: number
  lastCheckInDate?: Date
  streakStartDate?: Date
  timezone: string
  allowGracePeriod: boolean
  gracePeriodHours: number
  unlockedAt?: Date
  expiresAt?: Date
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  progressPercentage: number
  daysRemaining: number
  canCheckInToday: boolean
  isStreakActive: boolean
}

export class CheckInResponseDto {
  success: boolean
  message: string
  currentStreak: number
  isNewRecord: boolean
  capsuleUnlocked?: boolean
  streakCapsule?: StreakCapsuleResponseDto
}

export class StreakStatsDto {
  currentStreak: number
  longestStreak: number
  totalCheckIns: number
  lastCheckInDate?: Date
  streakStartDate?: Date
  isStreakActive: boolean
}
