import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { RiddleCapsule } from "./riddle-capsule.entity"

@Entity("riddle_attempts")
export class RiddleAttempt {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid" })
  capsuleId: string

  @Column({ type: "uuid" })
  riddleId: string

  @Column({ type: "text" })
  submittedAnswer: string

  @Column({ type: "boolean" })
  isCorrect: boolean

  @Column({ type: "float", nullable: true })
  similarityScore: number

  @CreateDateColumn()
  attemptedAt: Date

  @Column({ type: "timestamp" })
  nextAttemptAllowedAt: Date

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

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
