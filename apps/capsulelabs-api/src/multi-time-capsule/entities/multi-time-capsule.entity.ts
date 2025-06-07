import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

@Entity("timezone_settings")
export class TimeZoneSettings {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column("simple-array")
  selectedTimeZones: string[]

  @Column({ type: "smallint", nullable: true })
  targetHour: number

  @Column({ default: true })
  isActive: boolean

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    timeZoneLabels?: Record<string, string>
    preferences?: Record<string, any>
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity("timezone_access_attempts")
export class TimeZoneAccessAttempt {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column()
  @Index()
  timeZone: string

  @Column({ type: "timestamp with time zone" })
  @Index()
  accessTime: Date

  @Column({ type: "smallint" })
  localHour: number

  @Column()
  localTimeString: string

  @Column()
  utcOffset: string

  @Column({ default: false })
  @Index()
  isValidAttempt: boolean

  @Column({ nullable: true })
  sessionId: string

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    location?: string
    deviceInfo?: string
    ipAddress?: string
    userAgent?: string
  }

  @CreateDateColumn()
  createdAt: Date
}

@Entity("timezone_unlock_sessions")
export class TimeZoneUnlockSession {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column({ type: "smallint" })
  targetHour: number

  @Column("simple-array")
  requiredTimeZones: string[]

  @Column("simple-array")
  completedTimeZones: string[]

  @Column({ type: "timestamp with time zone" })
  sessionStartTime: Date

  @Column({ type: "timestamp with time zone", nullable: true })
  sessionEndTime: Date

  @Column({
    type: "enum",
    enum: ["active", "completed", "expired", "failed"],
    default: "active",
  })
  status: "active" | "completed" | "expired" | "failed"

  @Column({ default: false })
  capsuleUnlocked: boolean

  @Column({ type: "timestamp with time zone", nullable: true })
  capsuleUnlockedAt: Date

  @Column({ type: "smallint", default: 60 })
  sessionTimeoutMinutes: number

  @Column({ type: "jsonb", nullable: true })
  unlockData: {
    accessAttempts?: string[]
    completionOrder?: string[]
    totalDuration?: number
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity("timezone_capsule_unlocks")
export class TimeZoneCapsuleUnlock {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column()
  sessionId: string

  @Column({ type: "smallint" })
  unlockedAtHour: number

  @Column("simple-array")
  timeZonesUsed: string[]

  @Column({ type: "timestamp with time zone" })
  unlockedAt: Date

  @Column({ type: "smallint" })
  totalAttempts: number

  @Column({ type: "smallint" })
  sessionDurationMinutes: number

  @Column({ type: "jsonb" })
  unlockDetails: {
    accessOrder: string[]
    timingDetails: Record<string, any>
    achievements?: string[]
  }

  @CreateDateColumn()
  createdAt: Date
}
