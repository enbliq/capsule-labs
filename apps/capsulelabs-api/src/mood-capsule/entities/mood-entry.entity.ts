import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

export enum MoodType {
  JOURNAL = "journal",
  CHECK_IN = "check_in",
}

export enum SentimentLabel {
  VERY_NEGATIVE = "very_negative",
  NEGATIVE = "negative",
  NEUTRAL = "neutral",
  POSITIVE = "positive",
  VERY_POSITIVE = "very_positive",
}

@Entity("mood_entries")
export class MoodEntry {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("uuid")
  userId: string

  @Column({
    type: "enum",
    enum: MoodType,
  })
  type: MoodType

  @Column("text")
  content: string

  @Column("decimal", { precision: 3, scale: 2 })
  sentimentScore: number // -1 to 1 range

  @Column({
    type: "enum",
    enum: SentimentLabel,
  })
  sentimentLabel: SentimentLabel

  @Column("decimal", { precision: 3, scale: 2 })
  confidence: number // 0 to 1 range

  @Column("jsonb", { nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
