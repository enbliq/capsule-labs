import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { DreamCapsuleInteractionLog } from "./dream-capsule-interaction-log.entity"

export enum DreamCapsuleStatus {
  LOCKED = "locked",
  UNLOCKED = "unlocked",
  EXPIRED = "expired",
}

export enum DreamCapsuleType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  MIXED = "mixed",
}

@Entity("dream_capsules")
export class DreamCapsule {
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
    enum: DreamCapsuleType,
    default: DreamCapsuleType.TEXT,
  })
  type: DreamCapsuleType

  @Column({
    type: "enum",
    enum: DreamCapsuleStatus,
    default: DreamCapsuleStatus.LOCKED,
  })
  status: DreamCapsuleStatus

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "int", default: 50 })
  minimumWordCount: number

  @Column({ type: "time", default: "09:00:00" })
  cutoffTime: string

  @Column({ type: "varchar", length: 50, default: "UTC" })
  timezone: string

  @Column({ type: "timestamp", nullable: true })
  unlockedAt: Date

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date

  @Column({ type: "uuid", nullable: true })
  unlockedByDreamLogId: string

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(
    () => DreamCapsuleInteractionLog,
    (log) => log.capsule,
  )
  interactionLogs: DreamCapsuleInteractionLog[]
}
