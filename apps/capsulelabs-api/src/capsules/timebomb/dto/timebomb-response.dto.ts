import type { TimeBombCapsule } from "../schemas/timebomb-capsule.schema"

export class TimeBombResponseDto {
  id: string
  contentType: string
  message?: string
  mediaUrl?: string
  location: {
    lat: number
    lng: number
  }
  createdAt: Date
  createdBy: string
  expiresAt: Date
  defusers: string[]
  maxDefusers: number
  status: string
  timeRemaining: number // in seconds

  constructor(timeBomb: TimeBombCapsule) {
    this.id = timeBomb.id
    this.contentType = timeBomb.contentType
    this.message = timeBomb.message
    this.mediaUrl = timeBomb.mediaUrl
    this.location = timeBomb.location
    this.createdAt = timeBomb.createdAt
    this.createdBy = timeBomb.createdBy
    this.expiresAt = timeBomb.expiresAt
    this.defusers = timeBomb.defusers
    this.maxDefusers = timeBomb.maxDefusers
    this.status = timeBomb.status

    // Calculate time remaining in seconds
    const now = new Date()
    const expiresAt = new Date(timeBomb.expiresAt)
    this.timeRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
  }
}
