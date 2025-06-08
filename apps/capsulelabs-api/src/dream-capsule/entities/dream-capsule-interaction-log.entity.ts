import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { DreamCapsule } from "./dream-capsule.entity"

export enum DreamInteractionType {
  CREATED = "created",
  VIEWED = "viewed",
  DREAM_LOGGED = "dream_logged",
  DREAM_VALIDATED = "dream_validated",
  DREAM_REJECTED = "dream_rejected",
  UNLOCKED = "unlocked",
  EXPIRED = "expired",
}

@Entity("dream_capsule_interaction_logs")
export class DreamCapsuleInteractionLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid" })
  capsuleId: string

  @Column({
    type: "enum",
    enum: DreamInteractionType,
  })
  type: DreamInteractionType

  @Column({ type: "uuid", nullable: true })
  dreamLogId: string

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent: string

  @Column({ type: "inet", nullable: true })
  ipAddress: string

  @CreateDateColumn()
  timestamp: Date

  @ManyToOne(
    () => DreamCapsule,
    (capsule) => capsule.interactionLogs,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: DreamCapsule
}
