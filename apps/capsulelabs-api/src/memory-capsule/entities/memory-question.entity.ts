import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm"
import { MemoryCapsule } from "./memory-capsule.entity"

export enum QuestionType {
  MOOD = "mood",
  CAPSULE_INTERACTION = "capsule_interaction",
  DAILY_ACTIVITY = "daily_activity",
  TIMESTAMP = "timestamp",
  CONTENT_BASED = "content_based",
}

export enum QuestionStatus {
  ACTIVE = "active",
  ANSWERED_CORRECT = "answered_correct",
  ANSWERED_INCORRECT = "answered_incorrect",
  EXPIRED = "expired",
}

@Entity("memory_questions")
export class MemoryQuestion {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  capsuleId: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "text" })
  question: string

  @Column({ type: "jsonb" })
  correctAnswer: Record<string, any>

  @Column({ type: "jsonb", nullable: true })
  userAnswer: Record<string, any>

  @Column({
    type: "enum",
    enum: QuestionType,
  })
  type: QuestionType

  @Column({
    type: "enum",
    enum: QuestionStatus,
    default: QuestionStatus.ACTIVE,
  })
  status: QuestionStatus

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "timestamp", nullable: true })
  answeredAt: Date

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(
    () => MemoryCapsule,
    (capsule) => capsule.memoryQuestions,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: MemoryCapsule
}
