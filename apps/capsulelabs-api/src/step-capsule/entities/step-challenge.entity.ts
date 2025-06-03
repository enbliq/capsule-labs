import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import type { ChallengeAttempt } from "./challenge-attempt.entity"

export enum ChallengeDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  EXTREME = "extreme",
}

export enum ChallengeStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

@Entity("step_challenges")
export class StepChallenge {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("text")
  title: string

  @Column("text", { nullable: true })
  description: string

  @Column("int")
  stepGoal: number

  @Column("decimal", { precision: 10, scale: 6 })
  distanceKm: number

  @Column({
    type: "enum",
    enum: ChallengeDifficulty,
    default: ChallengeDifficulty.MEDIUM,
  })
  difficulty: ChallengeDifficulty

  @Column({
    type: "enum",
    enum: ChallengeStatus,
    default: ChallengeStatus.ACTIVE,
  })
  status: ChallengeStatus

  // Route definition as array of GPS coordinates
  @Column("jsonb")
  routePoints: Array<{
    latitude: number
    longitude: number
    order: number
    isCheckpoint?: boolean
    name?: string
  }>

  // Bounding box for route validation
  @Column("jsonb")
  routeBounds: {
    north: number
    south: number
    east: number
    west: number
  }

  @Column("int", { default: 50 }) // meters
  routeToleranceMeters: number

  @Column("int", { default: 3600 }) // seconds (1 hour)
  timeLimit: number

  @Column("int", { default: 100 }) // STRK tokens
  rewardAmount: number

  @Column("jsonb", { nullable: true })
  metadata: Record<string, any>

  @OneToMany("ChallengeAttempt", "challenge")
  attempts: ChallengeAttempt[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
