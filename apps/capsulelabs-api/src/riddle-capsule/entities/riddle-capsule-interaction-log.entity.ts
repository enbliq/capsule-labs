import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { RiddleCapsule } from "./riddle-capsule.entity"

export enum RiddleInteractionType {
  CREATED = "created",
  VIEWED = "viewed",
  RIDDLE_ASSIGNED = "riddle_assigned",
  RIDDLE_ATTEMPTED = "riddle_attempted",
  UNLOCKED = "unlocked",
  EXPIRED = "expired",
  HINT_REQUESTED = "hint_requested",
}

@Entity("riddle_capsule_interaction_logs")
export class RiddleCapsuleInteractionLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid" })
  capsuleId: string

  @Column({
    type: "enum",
    enum: RiddleInteractionType,
  })
  type: RiddleInteractionType

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent: string

  @Column({ type: "inet", nullable: true })
  ipAddress: string

  @CreateDateColumn()
  timestamp: Date

  @ManyToOne(
    () => RiddleCapsule,
    (capsule) => capsule.interactionLogs,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: RiddleCapsule
}
