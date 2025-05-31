export interface Player {
  id: string
  socketId: string
  username: string
  isReady: boolean
  score: number
  completedAt?: Date
}

export interface DuelRoom {
  id: string
  players: Player[]
  status: DuelStatus
  task?: Task
  winner?: Player
  createdAt: Date
  startedAt?: Date
  endedAt?: Date
  timeoutId?: NodeJS.Timeout
}

export interface Task {
  id: string
  type: TaskType
  question: string
  answer: string | number
  options?: string[]
  timeLimit: number // in seconds
}

export enum DuelStatus {
  WAITING = "waiting",
  READY = "ready",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum TaskType {
  MATH = "math",
  REACTION = "reaction",
  PUZZLE = "puzzle",
  TRIVIA = "trivia",
}

export interface ChallengeRequest {
  challengerId: string
  challengedId: string
  taskType?: TaskType
}

export interface DuelResult {
  roomId: string
  winner: Player
  loser: Player
  task: Task
  duration: number
  capsuleReward: string
}
