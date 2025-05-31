export interface TimeLoopCapsule {
  id: string
  title: string
  description: string
  reward: string
  createdBy: string
  createdAt: Date
  expiresAt?: Date

  // Time loop configuration
  loopConfig: LoopConfig
  taskConfig: TaskConfig

  // State tracking
  currentState: CapsuleState
  stateHistory: StateTransition[]

  // User progress
  userProgress: Map<string, UserProgress> // userId -> progress

  // Completion tracking
  permanentlyUnlocked: boolean
  permanentlyUnlockedAt?: Date
  permanentlyUnlockedBy?: string[]

  // Status
  isActive: boolean
}

export interface LoopConfig {
  dailyResetTime: string // HH:MM format (e.g., "00:00")
  timezone: string
  streakRequiredForPermanentUnlock: number
  gracePeriodHours: number // Hours after reset time to complete tasks
  allowMakeupTasks: boolean
  maxMissedDaysBeforeReset: number
}

export interface TaskConfig {
  dailyTasks: DailyTask[]
  taskOrder: TaskOrder
  allowPartialCompletion: boolean
  minimumTasksRequired: number // Minimum tasks to complete per day
}

export interface DailyTask {
  id: string
  type: TaskType
  title: string
  description: string
  config: TaskSpecificConfig
  points: number
  isRequired: boolean
  estimatedMinutes: number
}

export interface TaskSpecificConfig {
  // Steps task
  targetSteps?: number
  allowManualEntry?: boolean

  // Quiz task
  questions?: QuizQuestion[]
  passingScore?: number

  // Gratitude task
  minimumCharacters?: number
  promptText?: string

  // Habit task
  habitName?: string
  verificationMethod?: VerificationMethod

  // Photo task
  requiredTags?: string[]
  locationRequired?: boolean

  // Reading task
  articleUrl?: string
  minimumReadTime?: number

  // Meditation task
  minimumDuration?: number
  guidedSession?: boolean
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

export interface UserProgress {
  userId: string
  currentStreak: number
  longestStreak: number
  totalDaysCompleted: number
  lastCompletionDate?: Date
  currentDayTasks: TaskCompletion[]
  streakHistory: StreakEntry[]
  missedDays: Date[]
  isEligibleForPermanentUnlock: boolean
}

export interface TaskCompletion {
  taskId: string
  completedAt: Date
  submissionData: any
  points: number
  isValid: boolean
  validationResult?: TaskValidationResult
}

export interface StreakEntry {
  date: Date
  tasksCompleted: number
  totalTasks: number
  points: number
  completionRate: number
}

export interface StateTransition {
  id: string
  fromState: CapsuleState
  toState: CapsuleState
  triggeredBy: StateTransitionTrigger
  triggeredAt: Date
  userId?: string
  reason: string
  metadata?: any
}

export interface TaskValidationResult {
  isValid: boolean
  score: number
  feedback: string
  errors?: string[]
  warnings?: string[]
  metadata?: any
}

export interface DailyResetResult {
  capsuleId: string
  affectedUsers: string[]
  newState: CapsuleState
  resetReason: string
  timestamp: Date
}

export interface StreakCheckResult {
  userId: string
  currentStreak: number
  streakBroken: boolean
  eligibleForPermanentUnlock: boolean
  daysUntilPermanentUnlock: number
}

export enum CapsuleState {
  LOCKED = "locked",
  UNLOCKED = "unlocked",
  GRACE_PERIOD = "grace_period",
  PERMANENTLY_UNLOCKED = "permanently_unlocked",
  EXPIRED = "expired",
  INACTIVE = "inactive",
}

export enum TaskType {
  STEPS = "steps",
  QUIZ = "quiz",
  GRATITUDE = "gratitude",
  HABIT_TRACKER = "habit_tracker",
  PHOTO_CHALLENGE = "photo_challenge",
  READING = "reading",
  MEDITATION = "meditation",
  CUSTOM = "custom",
}

export enum TaskOrder {
  SEQUENTIAL = "sequential", // Tasks must be completed in order
  FLEXIBLE = "flexible", // Tasks can be completed in any order
  RANDOM = "random", // Random task selection each day
}

export enum VerificationMethod {
  SELF_REPORT = "self_report",
  PHOTO_PROOF = "photo_proof",
  LOCATION_CHECK = "location_check",
  TIMER_BASED = "timer_based",
}

export enum StateTransitionTrigger {
  DAILY_RESET = "daily_reset",
  TASK_COMPLETION = "task_completion",
  STREAK_ACHIEVEMENT = "streak_achievement",
  MISSED_DEADLINE = "missed_deadline",
  MANUAL_OVERRIDE = "manual_override",
  GRACE_PERIOD_EXPIRED = "grace_period_expired",
  PERMANENT_UNLOCK = "permanent_unlock",
}

export interface TaskSubmission {
  taskId: string
  userId: string
  submissionData: any
  submittedAt: Date
  deviceInfo?: any
}

export interface MakeupTaskOpportunity {
  userId: string
  missedDate: Date
  availableTasks: DailyTask[]
  deadline: Date
  penaltyPoints: number
}
