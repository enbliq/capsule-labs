import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

@Entity("daily_reflections")
export class DailyReflection {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column({ type: "date" })
  @Index()
  reflectionDate: Date

  @Column("text")
  content: string

  @Column("text", { nullable: true })
  gratitudeNote: string

  @Column({
    type: "enum",
    enum: ["very_happy", "happy", "neutral", "sad", "very_sad"],
    nullable: true,
  })
  mood: "very_happy" | "happy" | "neutral" | "sad" | "very_sad"

  @Column("simple-array", { nullable: true })
  tags: string[]

  @Column({ type: "smallint" })
  wordCount: number

  @Column({ type: "smallint" })
  characterCount: number

  @Column({ default: false })
  isEdited: boolean

  @Column({ type: "timestamp with time zone", nullable: true })
  lastEditedAt: Date

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Unique constraint to prevent multiple entries per day per user
  @Index(["userId", "reflectionDate"], { unique: true })
  userDateIndex: string
}

@Entity("reflection_streaks")
export class ReflectionStreak {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column({ type: "smallint", default: 0 })
  currentStreak: number

  @Column({ type: "smallint", default: 0 })
  longestStreak: number

  @Column({ type: "smallint", default: 0 })
  totalReflections: number

  @Column({ type: "date", nullable: true })
  lastReflectionDate: Date

  @Column({ type: "date", nullable: true })
  streakStartDate: Date

  @Column({ default: false })
  capsuleUnlocked: boolean

  @Column({ type: "timestamp with time zone", nullable: true })
  capsuleUnlockedAt: Date

  @Column({ type: "smallint", default: 7 })
  requiredStreakForUnlock: number

  @Column({ type: "jsonb", nullable: true })
  achievements: {
    firstReflection?: Date
    weeklyStreaks?: number
    monthlyStreaks?: number
    totalWords?: number
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity("reflection_prompts")
export class ReflectionPrompt {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column("text")
  prompt: string

  @Column({
    type: "enum",
    enum: ["gratitude", "growth", "mindfulness", "goals", "relationships", "general"],
    default: "general",
  })
  category: "gratitude" | "growth" | "mindfulness" | "goals" | "relationships" | "general"

  @Column({ default: true })
  isActive: boolean

  @Column({ type: "smallint", default: 1 })
  difficulty: number // 1-5 scale

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
