import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { ShadowCapsule } from "./shadow-capsule.entity"

export enum ShadowInteractionType {
  CREATED = "created",
  VIEWED = "viewed",
  UNLOCK_ATTEMPTED = "unlock_attempted",
  UNLOCKED = "unlocked",
  EXPIRED = "expired",
}

@Entity("shadow_capsule_interaction_logs")
export class ShadowCapsuleInteractionLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid" })
  capsuleId: string

  @Column({
    type: "enum",
    enum: ShadowInteractionType,
  })
  type: ShadowInteractionType

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent: string

  @Column({ type: "inet", nullable: true })
  ipAddress: string

  @CreateDateColumn()
  timestamp: Date

  @ManyToOne(
    () => ShadowCapsule,
    (capsule) => capsule.interactionLogs,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: ShadowCapsule
}
