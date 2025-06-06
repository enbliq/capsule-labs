import type { EmotionType } from "../enums/emotion-type.enum"

export interface IEmotionCapsule {
  id: string
  title: string
  content?: string
  userId?: string
  targetEmotion: EmotionType
  detectionConfidence: number
  unlocked: boolean
  unlockAttempts: number
  lastUnlockAttempt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IEmotionCapsuleService {
  create(createDto: any): Promise<IEmotionCapsule>
  findAll(): Promise<IEmotionCapsule[]>
  findByUser(userId: string): Promise<IEmotionCapsule[]>
  findOne(id: string): Promise<IEmotionCapsule>
  attemptUnlock(id: string, submitDto: any): Promise<any>
}
