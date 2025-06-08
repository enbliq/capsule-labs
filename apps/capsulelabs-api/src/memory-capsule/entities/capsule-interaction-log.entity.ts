import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { MemoryCapsule } from "./memory-capsule.entity"

export enum InteractionType {
  CREATED = "created",
  VIEWED = "viewed",
  UNLOCK_ATTEMPTED = "unlock_attempted",
  UNLOCKED = "unlocked",
  QUESTION_ANSWERED = "question_answered",
  EXPIRED = "expired",
}

@Entity("capsule_interaction_logs")
export class CapsuleInteractionLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid" })
  capsuleId: string

  @Column({
    type: "enum",
    enum: InteractionType,
  })
  type: InteractionType

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent: string

  @Column({ type: "inet", nullable: true })
  ipAddress: string

  @CreateDateColumn()
  timestamp: Date

  @ManyToOne(
    () => MemoryCapsule,
    (capsule) => capsule.interactionLogs,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: MemoryCapsule
}
