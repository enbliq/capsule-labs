import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import type { ChallengeAttempt } from "./challenge-attempt.entity"

@Entity("step_data")
export class StepData {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("uuid")
  attemptId: string

  @ManyToOne("ChallengeAttempt", "stepData")
  @JoinColumn({ name: "attemptId" })
  attempt: ChallengeAttempt

  @Column("int")
  stepCount: number

  @Column("int")
  cumulativeSteps: number

  @Column("decimal", { precision: 5, scale: 2, nullable: true })
  cadence: number // steps per minute

  @Column("decimal", { precision: 5, scale: 2, nullable: true })
  strideLength: number // meters

  @Column("timestamp")
  timestamp: Date

  @Column("jsonb", { nullable: true })
  deviceData: Record<string, any>

  @CreateDateColumn()
  createdAt: Date
}
