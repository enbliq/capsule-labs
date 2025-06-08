import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

@Entity("alarm_settings")
export class AlarmSettings {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column({ type: "smallint" })
  targetHour: number

  @Column({ type: "smallint" })
  targetMinute: number

  @Column({ type: "smallint", default: 10 })
  graceWindowMinutes: number

  @Column({ type: "smallint", default: 3 })
  requiredStreak: number

  @Column({ default: true })
  enablePushNotifications: boolean

  @Column({ default: "UTC" })
  timezone: string

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity("wake_up_logs")
export class WakeUpLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column({ type: "date" })
  @Index()
  date: Date

  @Column({ type: "timestamp with time zone" })
  targetWakeTime: Date

  @Column({ type: "timestamp with time zone", nullable: true })
  actualWakeTime: Date

  @Column({ type: "timestamp with time zone", nullable: true })
  alarmResponseTime: Date

  @Column({
    type: "enum",
    enum: ["pending", "on_time", "late", "missed", "manual"],
    default: "pending",
  })
  status: "pending" | "on_time" | "late" | "missed" | "manual"

  @Column({
    type: "enum",
    enum: ["alarm", "manual", "notification", "snooze"],
    nullable: true,
  })
  wakeMethod: "alarm" | "manual" | "notification" | "snooze"

  @Column({ type: "smallint", nullable: true })
  minutesLate: number

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity("alarm_streaks")
export class AlarmStreak {
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
  totalSuccessfulDays: number

  @Column({ type: "smallint", default: 0 })
  totalAttempts: number

  @Column({ type: "date", nullable: true })
  lastSuccessDate: Date

  @Column({ type: "date", nullable: true })
  streakStartDate: Date

  @Column({ default: false })
  capsuleUnlocked: boolean

  @Column({ type: "timestamp with time zone", nullable: true })
  capsuleUnlockedAt: Date

  @Column({ type: "smallint", default: 3 })
  requiredStreakForUnlock: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
