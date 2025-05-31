import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { TruthQuestion } from "./truth-question.entity"
import { TruthAnswer } from "./truth-answer.entity"

@Entity("truth_capsules")
export class TruthCapsule {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column("text")
  content: string

  @Column()
  userId: string

  @Column({ default: 0.7 })
  truthThreshold: number

  @Column({ default: 3 })
  maxAttempts: number

  @Column({ default: 0 })
  attemptCount: number

  @Column({ default: false })
  isLocked: boolean

  @OneToMany(
    () => TruthQuestion,
    (question) => question.capsule,
    { cascade: true },
  )
  questions: TruthQuestion[]

  @OneToMany(
    () => TruthAnswer,
    (answer) => answer.capsule,
  )
  answers: TruthAnswer[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
