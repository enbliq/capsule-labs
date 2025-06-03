import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm"
import type { StepChallenge } from "./step-challenge.entity"
import type { GPSPoint } from "./gps-point.entity"
import type { StepData } from "./step-data.entity"

export enum AttemptStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  ABANDONED = "abandoned",
}

@Entity("challenge_attempts")
export class ChallengeAttempt {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("uuid")
  userId: string

  @Column("uuid")
  challengeId: string

  @ManyToOne("StepChallenge", "attempts")
  @JoinColumn({ name: "challengeId" })
  challenge: StepChallenge

  @Column({
    type: "enum",
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status: AttemptStatus

  @Column("timestamp")
  startedAt: Date

  @Column("timestamp", { nullable: true })
  completedAt: Date

  @Column("int", { default: 0 })
  currentSteps: number

  @Column("decimal", { precision: 10, scale: 6, default: 0 })
  currentDistanceKm: number

  @Column("int", { default: 0 })
  routeProgress: number // percentage 0-100

  @Column("boolean", { default: false })
  stepGoalMet: boolean

  @Column("boolean", { default: false })
  routeCompleted: boolean

  @Column("jsonb", { nullable: true })
  completionData: Record<string, any>

  @OneToMany("GPSPoint", "attempt")
  gpsPoints: GPSPoint[]

  @OneToMany("StepData", "attempt")
  stepData: StepData[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
