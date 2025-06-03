import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

export enum CapsuleStatus {
  LOCKED = "locked",
  UNLOCKED = "unlocked",
  OPENED = "opened",
}

@Entity("mood_capsules")
export class MoodCapsule {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("uuid")
  userId: string

  @Column("text")
  title: string

  @Column("text", { nullable: true })
  description: string

  @Column("text")
  content: string

  @Column({
    type: "enum",
    enum: CapsuleStatus,
    default: CapsuleStatus.LOCKED,
  })
  status: CapsuleStatus

  @Column("decimal", { precision: 3, scale: 2, nullable: true })
  unlockThreshold: number // Consistency threshold (0-1)

  @Column("int", { default: 3 })
  requiredDays: number

  @Column("timestamp", { nullable: true })
  unlockedAt: Date

  @Column("timestamp", { nullable: true })
  openedAt: Date

  @Column("jsonb", { nullable: true })
  unlockCriteria: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
