import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { TruthCapsule } from "./truth-capsule.entity"
import { TruthQuestion } from "./truth-question.entity"

@Entity("truth_answers")
export class TruthAnswer {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  userId: string

  @Column()
  capsuleId: string

  @Column()
  questionId: string

  @Column("text")
  answerText: string

  @Column("float")
  truthScore: number

  @Column("float")
  sentimentScore: number

  @Column("text", { nullable: true })
  analysisDetails: string

  @Column()
  sessionId: string

  @ManyToOne(
    () => TruthCapsule,
    (capsule) => capsule.answers,
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: TruthCapsule

  @ManyToOne(() => TruthQuestion)
  @JoinColumn({ name: "questionId" })
  question: TruthQuestion

  @CreateDateColumn()
  createdAt: Date
}
