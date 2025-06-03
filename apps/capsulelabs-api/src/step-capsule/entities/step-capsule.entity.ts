import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm"
import type { StepChallenge } from "./step-challenge.entity"

export enum StepCapsuleStatus {
  LOCKED = "locked",
  UNLOCKED = "unlocked",
  OPENED = "opened",
}

@Entity("step_capsules")
export class StepCapsule {
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
    enum: StepCapsuleStatus,
    default: StepCapsuleStatus.LOCKED,
  })
  status: StepCapsuleStatus

  @Column("uuid")
  challengeId: string

  @ManyToOne("StepChallenge")
  @JoinColumn({ name: "challengeId" })
  challenge: StepChallenge

  @Column("timestamp", { nullable: true })
  unlockedAt: Date

  @Column("timestamp", { nullable: true })
  openedAt: Date

  @Column("jsonb", { nullable: true })
  unlockData: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
