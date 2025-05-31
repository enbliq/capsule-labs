export interface PuzzleCapsule {
  id: string
  title: string
  description: string
  reward: string
  createdBy: string
  createdAt: Date
  expiresAt?: Date

  // Puzzle configuration
  puzzleType: PuzzleType
  puzzleConfig: PuzzleConfig
  difficulty: PuzzleDifficulty

  // Solution tracking
  solved: boolean
  solvedBy?: string
  solvedAt?: Date
  attempts: PuzzleAttempt[]

  // Hint system
  hintsEnabled: boolean
  maxHints: number
  hintPenalty?: number // Reduce reward by percentage

  // Retry logic
  maxAttempts?: number
  retryDelay?: number // Seconds between attempts

  // Status
  isActive: boolean
}

export interface PuzzleConfig {
  // Common fields
  timeLimit?: number // Seconds
  showProgress?: boolean

  // Sudoku specific
  grid?: number[][]
  solution?: number[][]

  // Cipher specific
  cipherType?: CipherType
  key?: string
  encryptedText?: string
  plainText?: string

  // Logic gate specific
  gates?: LogicGate[]
  inputs?: boolean[]
  expectedOutput?: boolean[]

  // Math puzzle specific
  equation?: string
  variables?: Record<string, number>
  targetValue?: number

  // Word puzzle specific
  words?: string[]
  clues?: string[]
  gridSize?: { rows: number; cols: number }
}

export interface PuzzleAttempt {
  id: string
  userId: string
  submittedAt: Date
  solution: any
  isCorrect: boolean
  timeTaken: number // Seconds
  hintsUsed: number
  score?: number
}

export interface PuzzleHint {
  id: string
  puzzleId: string
  hintNumber: number
  content: string
  revealedAt?: Date
  penalty: number // Percentage reduction in reward
}

export interface PuzzleSolution {
  isCorrect: boolean
  score: number
  timeTaken: number
  hintsUsed: number
  feedback?: string
  errors?: string[]
}

export enum PuzzleType {
  SUDOKU = "sudoku",
  CIPHER = "cipher",
  LOGIC_GATE = "logic_gate",
  MATH_PUZZLE = "math_puzzle",
  WORD_PUZZLE = "word_puzzle",
}

export enum PuzzleDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  EXPERT = "expert",
}

export enum CipherType {
  CAESAR = "caesar",
  SUBSTITUTION = "substitution",
  VIGENERE = "vigenere",
  MORSE = "morse",
}

export interface LogicGate {
  id: string
  type: LogicGateType
  inputs: string[] // Input gate IDs or input names
  output: string
}

export enum LogicGateType {
  AND = "AND",
  OR = "OR",
  NOT = "NOT",
  NAND = "NAND",
  NOR = "NOR",
  XOR = "XOR",
}

export interface PuzzleTemplate {
  type: PuzzleType
  difficulty: PuzzleDifficulty
  name: string
  description: string
  defaultConfig: Partial<PuzzleConfig>
  estimatedTime: number // Minutes
}

export enum PuzzleStatus {
  ACTIVE = "active",
  SOLVED = "solved",
  EXPIRED = "expired",
  INACTIVE = "inactive",
}
