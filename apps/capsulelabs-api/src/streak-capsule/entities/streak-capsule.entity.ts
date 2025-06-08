import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { StreakCapsuleInteractionLog } from "./streak-capsule-interaction-log.entity"

export enum StreakCapsuleStatus {
  LOCKED = "locked",
  UNLOCKED = "unlocked",
  EXPIRED = "expired",
}

export enum StreakCapsuleType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  MIXED = "mixed",
}

@Entity("streak_capsules")
export class StreakCapsule {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  title: string

  @Column({ type: "text", nullable: true })
  description: string

  @Column({ type: "jsonb" })
  content: Record<string, any>

  @Column({
    type: "enum",
    enum: StreakCapsuleType,
    default: StreakCapsuleType.TEXT,
  })
  type: StreakCapsuleType

  @Column({
    type: "enum",
    enum: StreakCapsuleStatus,
    default: StreakCapsuleStatus.LOCKED,
  })
  status: StreakCapsuleStatus

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "int" })
  requiredStreakDays: number

  @Column({ type: "int", default: 0 })
  currentStreak: number

  @Column({ type: "int", default: 0 })
  longestStreak: number

  @Column({ type: "int", default: 0 })
  totalCheckIns: number

  @Column({ type: "date", nullable: true })
  lastCheckInDate: Date

  @Column({ type: "date", nullable: true })
  streakStartDate: Date

  @Column({ type: "varchar", length: 50, default: "UTC" })
  timezone: string

  @Column({ type: "boolean", default: false })
  allowGracePeriod: boolean

  @Column({ type: "int", default: 0 })
  gracePeriodHours: number

  @Column({ type: "timestamp", nullable: true })
  unlockedAt: Date

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(
    () => StreakCapsuleInteractionLog,
    (log) => log.capsule,
  )
  interactionLogs: StreakCapsuleInteractionLog[]
}
