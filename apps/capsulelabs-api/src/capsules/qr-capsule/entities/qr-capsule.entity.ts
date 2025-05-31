export interface QrCapsule {
  id: string
  qrCodeHash: string
  title: string
  description: string
  reward: string
  createdBy: string
  createdAt: Date
  expiresAt?: Date

  // Geo restrictions
  geoLocked?: boolean
  latitude?: number
  longitude?: number
  radiusMeters?: number

  // Time restrictions
  timeWindow?: TimeWindow

  // Unlock tracking
  unlocked: boolean
  unlockedBy?: string
  unlockedAt?: Date

  // Usage limits
  maxUses?: number
  currentUses: number

  // Status
  isActive: boolean
}

export interface TimeWindow {
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  daysOfWeek?: number[] // 0-6 (Sunday-Saturday)
  timezone?: string
}

export interface GeoLocation {
  latitude: number
  longitude: number
}

export interface ScanResult {
  success: boolean
  capsule?: QrCapsule
  reward?: string
  message: string
  errorCode?: string
}

export enum QrCapsuleStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  EXHAUSTED = "exhausted",
  INACTIVE = "inactive",
}

export enum ScanErrorCode {
  INVALID_QR = "INVALID_QR",
  EXPIRED = "EXPIRED",
  GEO_RESTRICTED = "GEO_RESTRICTED",
  TIME_RESTRICTED = "TIME_RESTRICTED",
  ALREADY_UNLOCKED = "ALREADY_UNLOCKED",
  MAX_USES_REACHED = "MAX_USES_REACHED",
  INACTIVE = "INACTIVE",
}
