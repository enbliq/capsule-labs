import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { StreakCapsule } from "./streak-capsule.entity"

export enum StreakInteractionType {
  CREATED = "created",
  VIEWED = "viewed",
  CHECK_IN = "check_in",
  STREAK_BROKEN = "streak_broken",
  STREAK_COMPLETED = "streak_completed",
  UNLOCKED = "unlocked",
  EXPIRED = "expired",
}

@Entity("streak_capsule_interaction_logs")
export class StreakCapsuleInteractionLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid" })
  capsuleId: string

  @Column({
    type: "enum",
    enum: StreakInteractionType,
  })
  type: StreakInteractionType

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent: string

  @Column({ type: "inet", nullable: true })
  ipAddress: string

  @CreateDateColumn()
  timestamp: Date

  @ManyToOne(
    () => StreakCapsule,
    (capsule) => capsule.interactionLogs,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: StreakCapsule
}
