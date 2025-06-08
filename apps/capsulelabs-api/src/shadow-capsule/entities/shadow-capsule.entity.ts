import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { ShadowCapsuleInteractionLog } from "./shadow-capsule-interaction-log.entity"

export enum ShadowCapsuleStatus {
  LOCKED = "locked",
  UNLOCKED = "unlocked",
  EXPIRED = "expired",
}

export enum ShadowCapsuleType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  MIXED = "mixed",
}

@Entity("shadow_capsules")
export class ShadowCapsule {
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
    enum: ShadowCapsuleType,
    default: ShadowCapsuleType.TEXT,
  })
  type: ShadowCapsuleType

  @Column({
    type: "enum",
    enum: ShadowCapsuleStatus,
    default: ShadowCapsuleStatus.LOCKED,
  })
  status: ShadowCapsuleStatus

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "float" })
  latitude: number

  @Column({ type: "float" })
  longitude: number

  @Column({ type: "timestamp", nullable: true })
  lastTwilightStart: Date

  @Column({ type: "timestamp", nullable: true })
  lastTwilightEnd: Date

  @Column({ type: "timestamp", nullable: true })
  nextTwilightStart: Date

  @Column({ type: "timestamp", nullable: true })
  nextTwilightEnd: Date

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
    () => ShadowCapsuleInteractionLog,
    (log) => log.capsule,
  )
  interactionLogs: ShadowCapsuleInteractionLog[]
}
