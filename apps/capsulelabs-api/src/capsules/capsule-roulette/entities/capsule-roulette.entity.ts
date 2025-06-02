export interface RouletteCapsuleDrop {
  id: string
  title: string
  description: string
  scheduledDropTime: Date
  actualDropTime?: Date
  expiresAt: Date
  status: DropStatus

  // Reward configuration
  rewardConfig: RewardConfig

  // Targeting and eligibility
  eligibilityCriteria: EligibilityCriteria
  eligibleUserIds: string[]

  // Drop statistics
  notificationsSent: number
  totalClaimAttempts: number
  uniqueClaimers: number

  // Claim information
  claimedBy?: string
  claimedAt?: Date
  claimLatency?: number // milliseconds from drop to claim

  // Metadata
  createdAt: Date
  createdBy: string
  dropNumber: number // Sequential drop counter
  specialEvent?: SpecialEventConfig
}

export interface ClaimEvent {
  id: string
  capsuleDropId: string
  userId: string
  attemptTime: Date
  success: boolean

  // Claim details
  claimLatency: number
  userAgent?: string
  ipAddress?: string
  deviceFingerprint?: string

  // Reward information
  rewardAmount?: number
  rewardCurrency: string
  transactionHash?: string
  transactionStatus: TransactionStatus

  // Failure information
  failureReason?: string
  errorCode?: string

  // Anti-gaming data
  suspiciousActivity: boolean
  riskScore: number

  // Metadata
  createdAt: Date
}

export interface RewardConfig {
  baseAmount: number
  currency: string // 'STRK'

  // Multipliers
  streakMultiplier: number // Bonus for consecutive wins
  speedMultiplier: number // Bonus for fast claims
  rarityMultiplier: number // Special event bonus

  // Bonus conditions
  firstClaimBonus: number
  weekendBonus: number
  holidayBonus: number

  // Limits
  maxRewardAmount: number
  minRewardAmount: number
}

export interface EligibilityCriteria {
  // User requirements
  minimumAccountAge: number // days
  minimumActivity: number // actions in last 30 days
  verificationRequired: boolean
  premiumOnly: boolean

  // Geographic restrictions
  allowedCountries?: string[]
  blockedCountries?: string[]
  timezoneRestrictions?: string[]

  // Behavioral filters
  excludeBannedUsers: boolean
  excludeRecentWinners: boolean // days since last win
  maxWinsPerWeek: number

  // Technical requirements
  mobileAppRequired: boolean
  notificationEnabled: boolean
}

export interface SpecialEventConfig {
  eventName: string
  eventType: SpecialEventType
  multiplier: number
  description: string
  startDate: Date
  endDate: Date

  // Special rules
  multipleWinners?: boolean
  bonusRewards?: BonusReward[]
  customEligibility?: EligibilityCriteria
}

export interface BonusReward {
  type: BonusType
  amount: number
  currency: string
  condition: string
  description: string
}

export interface ClaimAttemptResult {
  success: boolean
  message: string
  claimEvent?: ClaimEvent
  rewardAmount?: number
  transactionHash?: string
  nextDropInfo?: NextDropInfo
}

export interface NextDropInfo {
  estimatedTimeRange: {
    earliest: Date
    latest: Date
  }
  eligibilityStatus: boolean
  reasonsIneligible?: string[]
}

export interface DropStatistics {
  dropId: string
  totalAttempts: number
  uniqueUsers: number
  averageLatency: number
  fastestClaim: number
  geographicDistribution: Record<string, number>
  deviceDistribution: Record<string, number>
  timeToFirstClaim: number
}

export interface UserRouletteStats {
  userId: string
  totalAttempts: number
  successfulClaims: number
  totalRewardsEarned: number
  averageClaimLatency: number
  currentStreak: number
  longestStreak: number
  lastWinDate?: Date
  winRate: number
  favoriteClaimTime: string // HH:MM
  riskScore: number
}

export interface DailyDropSchedule {
  date: Date
  scheduledTime: Date
  timeWindow: {
    earliest: Date
    latest: Date
  }
  blackoutPeriods: BlackoutPeriod[]
  specialEvent?: SpecialEventConfig
  estimatedParticipants: number
}

export interface BlackoutPeriod {
  start: Date
  end: Date
  reason: string
  recurring: boolean
}

export interface NotificationBatch {
  id: string
  dropId: string
  targetUsers: string[]
  channels: NotificationChannel[]
  scheduledTime: Date
  sentTime?: Date
  deliveryStats: NotificationDeliveryStats
}

export interface NotificationDeliveryStats {
  totalSent: number
  delivered: number
  failed: number
  opened: number
  clicked: number
  deliveryRate: number
  openRate: number
  clickRate: number
}

export enum DropStatus {
  SCHEDULED = "scheduled",
  DROPPED = "dropped",
  CLAIMED = "claimed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export enum TransactionStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum SpecialEventType {
  HOLIDAY = "holiday",
  ANNIVERSARY = "anniversary",
  MILESTONE = "milestone",
  COMMUNITY = "community",
  PARTNERSHIP = "partnership",
}

export enum BonusType {
  FIXED_AMOUNT = "fixed_amount",
  PERCENTAGE = "percentage",
  MULTIPLIER = "multiplier",
  NFT = "nft",
  EXPERIENCE = "experience",
}

export enum NotificationChannel {
  WEBSOCKET = "websocket",
  PUSH = "push",
  EMAIL = "email",
  SMS = "sms",
}

export enum ClaimFailureReason {
  ALREADY_CLAIMED = "already_claimed",
  USER_ALREADY_WON = "user_already_won",
  NOT_ELIGIBLE = "not_eligible",
  RATE_LIMITED = "rate_limited",
  SYSTEM_ERROR = "system_error",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  EXPIRED = "expired",
  NOT_DROPPED = "not_dropped",
}
