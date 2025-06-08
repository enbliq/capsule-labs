import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { RiddleDifficulty } from "./riddle-capsule.entity"

export enum RiddleCategory {
  WORDPLAY = "wordplay",
  LOGIC = "logic",
  MATH = "math",
  LATERAL = "lateral",
  MYSTERY = "mystery",
  RIDDLE = "riddle",
}

@Entity("riddles")
export class Riddle {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "text" })
  question: string

  @Column({ type: "text" })
  answer: string

  @Column({ type: "text", nullable: true })
  hint: string

  @Column({
    type: "enum",
    enum: RiddleCategory,
    default: RiddleCategory.RIDDLE,
  })
  category: RiddleCategory

  @Column({
    type: "enum",
    enum: RiddleDifficulty,
    default: RiddleDifficulty.MEDIUM,
  })
  difficulty: RiddleDifficulty

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "boolean", default: true })
  isActive: boolean

  @Column({ type: "int", default: 0 })
  usageCount: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
