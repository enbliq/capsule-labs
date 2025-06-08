import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { PolaroidCapsule } from "./polaroid-capsule.entity"

export enum PolaroidInteractionType {
  CREATED = "created",
  VIEWED = "viewed",
  THEME_ASSIGNED = "theme_assigned",
  PHOTO_SUBMITTED = "photo_submitted",
  PHOTO_APPROVED = "photo_approved",
  PHOTO_REJECTED = "photo_rejected",
  UNLOCKED = "unlocked",
  EXPIRED = "expired",
}

@Entity("polaroid_capsule_interaction_logs")
export class PolaroidCapsuleInteractionLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid" })
  capsuleId: string

  @Column({
    type: "enum",
    enum: PolaroidInteractionType,
  })
  type: PolaroidInteractionType

  @Column({ type: "uuid", nullable: true })
  themeId: string

  @Column({ type: "uuid", nullable: true })
  submissionId: string

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent: string

  @Column({ type: "inet", nullable: true })
  ipAddress: string

  @CreateDateColumn()
  timestamp: Date

  @ManyToOne(
    () => PolaroidCapsule,
    (capsule) => capsule.interactionLogs,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: PolaroidCapsule
}
