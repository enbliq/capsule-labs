import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm"
import { RiddleCapsuleInteractionLog } from "./riddle-capsule-interaction-log.entity"
import { Riddle } from "./riddle.entity"

export enum RiddleCapsuleStatus {
  LOCKED = "locked",
  UNLOCKED = "unlocked",
  EXPIRED = "expired",
}

export enum RiddleCapsuleType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  MIXED = "mixed",
}

export enum RiddleDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  EXPERT = "expert",
}

@Entity("riddle_capsules")
export class RiddleCapsule {
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
    enum: RiddleCapsuleType,
    default: RiddleCapsuleType.TEXT,
  })
  type: RiddleCapsuleType

  @Column({
    type: "enum",
    enum: RiddleCapsuleStatus,
    default: RiddleCapsuleStatus.LOCKED,
  })
  status: RiddleCapsuleStatus

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid", nullable: true })
  riddleId: string

  @Column({
    type: "enum",
    enum: RiddleDifficulty,
    default: RiddleDifficulty.MEDIUM,
  })
  preferredDifficulty: RiddleDifficulty

  @Column({ type: "boolean", default: false })
  useExternalApi: boolean

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

  @ManyToOne(() => Riddle, { nullable: true })
  @JoinColumn({ name: "riddleId" })
  riddle: Riddle

  @OneToMany(
    () => RiddleCapsuleInteractionLog,
    (log) => log.capsule,
  )
  interactionLogs: RiddleCapsuleInteractionLog[]
}
