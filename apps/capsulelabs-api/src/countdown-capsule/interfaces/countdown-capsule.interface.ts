export interface ICountdownCapsule {
  id: string
  title: string
  content?: string
  durationMinutes: number
  unlockAt?: Date
  createdAt: Date
  updatedAt: Date
  started: boolean
  unlocked: boolean
  createdBy?: string
  isExpired: boolean
  remainingTime: number
}

export interface ICountdownCapsuleService {
  create(createDto: any): Promise<ICountdownCapsule>
  start(startDto: any): Promise<ICountdownCapsule>
  view(capsuleId: string): Promise<ICountdownCapsule>
  findAll(): Promise<ICountdownCapsule[]>
  findByCreator(createdBy: string): Promise<ICountdownCapsule[]>
}
