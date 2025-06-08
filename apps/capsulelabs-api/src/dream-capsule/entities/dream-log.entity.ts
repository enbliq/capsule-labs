import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum DreamClarity {
  VIVID = "vivid",
  CLEAR = "clear",
  FUZZY = "fuzzy",
  VAGUE = "vague",
}

export enum DreamEmotion {
  HAPPY = "happy",
  EXCITED = "excited",
  CALM = "calm",
  NEUTRAL = "neutral",
  ANXIOUS = "anxious",
  SCARED = "scared",
  SAD = "sad",
  ANGRY = "angry",
}

@Entity("dream_logs")
export class DreamLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  @Index()
  userId: string

  @Column({ type: "text" })
  content: string

  @Column({ type: "int" })
  wordCount: number

  @Column({ type: "varchar", length: 255, nullable: true })
  title: string

  @Column({
    type: "enum",
    enum: DreamClarity,
    nullable: true,
  })
  clarity: DreamClarity

  @Column({
    type: "enum",
    enum: DreamEmotion,
    nullable: true,
  })
  emotion: DreamEmotion

  @Column({ type: "boolean", default: false })
  isLucid: boolean

  @Column({ type: "varchar", length: 50, default: "UTC" })
  timezone: string

  @Column({ type: "boolean", default: false })
  isBeforeCutoff: boolean

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ type: "date" })
  @Index()
  logDate: Date
}
