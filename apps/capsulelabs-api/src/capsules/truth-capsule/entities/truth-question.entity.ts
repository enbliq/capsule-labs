import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm"
import { TruthCapsule } from "./truth-capsule.entity"

export enum QuestionType {
  PERSONAL = "personal",
  FACTUAL = "factual",
  EMOTIONAL = "emotional",
  BEHAVIORAL = "behavioral",
}

@Entity("truth_questions")
export class TruthQuestion {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  capsuleId: string

  @Column()
  questionText: string

  @Column({
    type: "enum",
    enum: QuestionType,
    default: QuestionType.PERSONAL,
  })
  type: QuestionType

  @Column()
  orderIndex: number

  @Column({ nullable: true })
  expectedAnswerPattern: string

  @Column({ default: 1.0 })
  weight: number

  @ManyToOne(
    () => TruthCapsule,
    (capsule) => capsule.questions,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: TruthCapsule
}
