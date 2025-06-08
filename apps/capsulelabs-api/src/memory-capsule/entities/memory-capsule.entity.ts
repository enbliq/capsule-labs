import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { CapsuleInteractionLog } from "./capsule-interaction-log.entity"
import { MemoryQuestion } from "./memory-question.entity"

export enum CapsuleStatus {
  LOCKED = "locked",
  UNLOCKED = "unlocked",
  EXPIRED = "expired",
}

export enum CapsuleType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  MIXED = "mixed",
}

@Entity("memory_capsules")
export class MemoryCapsule {
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
    enum: CapsuleType,
    default: CapsuleType.TEXT,
  })
  type: CapsuleType

  @Column({
    type: "enum",
    enum: CapsuleStatus,
    default: CapsuleStatus.LOCKED,
  })
  status: CapsuleStatus

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "timestamp", nullable: true })
  unlockedAt: Date

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date

  @Column({ type: "int", default: 0 })
  unlockAttempts: number

  @Column({ type: "int", default: 3 })
  maxUnlockAttempts: number

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(
    () => CapsuleInteractionLog,
    (log) => log.capsule,
  )
  interactionLogs: CapsuleInteractionLog[]

  @OneToMany(
    () => MemoryQuestion,
    (question) => question.capsule,
  )
  memoryQuestions: MemoryQuestion[]
}
