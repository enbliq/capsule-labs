import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { PolaroidCapsuleInteractionLog } from "./polaroid-capsule-interaction-log.entity"

export enum PolaroidCapsuleStatus {
  LOCKED = "locked",
  UNLOCKED = "unlocked",
  EXPIRED = "expired",
}

export enum PolaroidCapsuleType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  MIXED = "mixed",
}

export enum ValidationMethod {
  MANUAL = "manual",
  AUTOMATIC = "automatic",
  HYBRID = "hybrid",
}

@Entity("polaroid_capsules")
export class PolaroidCapsule {
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
    enum: PolaroidCapsuleType,
    default: PolaroidCapsuleType.TEXT,
  })
  type: PolaroidCapsuleType

  @Column({
    type: "enum",
    enum: PolaroidCapsuleStatus,
    default: PolaroidCapsuleStatus.LOCKED,
  })
  status: PolaroidCapsuleStatus

  @Column({ type: "uuid" })
  userId: string

  @Column({
    type: "enum",
    enum: ValidationMethod,
    default: ValidationMethod.MANUAL,
  })
  validationMethod: ValidationMethod

  @Column({ type: "float", default: 0.7 })
  confidenceThreshold: number

  @Column({ type: "uuid", nullable: true })
  unlockedBySubmissionId: string

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
    () => PolaroidCapsuleInteractionLog,
    (log) => log.capsule,
  )
  interactionLogs: PolaroidCapsuleInteractionLog[]
}
