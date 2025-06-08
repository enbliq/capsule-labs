import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

export enum MoodType {
  VERY_HAPPY = "very_happy",
  HAPPY = "happy",
  NEUTRAL = "neutral",
  SAD = "sad",
  VERY_SAD = "very_sad",
  ANXIOUS = "anxious",
  EXCITED = "excited",
  CALM = "calm",
}

@Entity("daily_logs")
export class DailyLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "date" })
  logDate: Date

  @Column({
    type: "enum",
    enum: MoodType,
    nullable: true,
  })
  mood: MoodType

  @Column({ type: "text", nullable: true })
  notes: string

  @Column({ type: "jsonb", nullable: true })
  activities: string[]

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
