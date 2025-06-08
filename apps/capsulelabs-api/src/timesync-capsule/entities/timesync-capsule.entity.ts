import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

@Entity("sync_pulses")
export class SyncPulse {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "timestamp with time zone" })
  @Index()
  scheduledTime: Date

  @Column({ type: "timestamp with time zone" })
  actualBroadcastTime: Date

  @Column({ type: "int", default: 3000 })
  windowStartMs: number // milliseconds before scheduled time

  @Column({ type: "int", default: 3000 })
  windowEndMs: number // milliseconds after scheduled time

  @Column({ default: true })
  @Index()
  isActive: boolean

  @Column({ nullable: true })
  description: string

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    broadcastDelay?: number
    connectedClients?: number
    totalAttempts?: number
    successfulAttempts?: number
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity("sync_attempts")
export class SyncAttempt {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column()
  @Index()
  pulseId: string

  @Column({ type: "timestamp with time zone" })
  clientTimestamp: Date

  @Column({ type: "timestamp with time zone" })
  serverTimestamp: Date

  @Column({ type: "timestamp with time zone" })
  pulseScheduledTime: Date

  @Column({ type: "int" })
  timeDifference: number // in milliseconds

  @Column({ type: "int", default: 3000 })
  allowedWindow: number // in milliseconds

  @Column({ default: false })
  @Index()
  withinWindow: boolean

  @Column({ default: false })
  @Index()
  wasSuccessful: boolean

  @Column({ type: "int", nullable: true })
  networkLatency: number // in milliseconds

  @Column({ nullable: true })
  timeZone: string

  @Column({ type: "jsonb", nullable: true })
  deviceInfo: Record<string, any>

  @Column({ type: "jsonb", nullable: true })
  ntpData: {
    clockOffset?: number
    roundTripTime?: number
    ntpSyncTime?: Date
  }

  @CreateDateColumn()
  createdAt: Date
}

@Entity("timesync_capsule_unlocks")
export class TimeSyncCapsuleUnlock {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column()
  pulseId: string

  @Column()
  successfulAttemptId: string

  @Column({ type: "timestamp with time zone" })
  unlockedAt: Date

  @Column({ type: "int" })
  totalAttempts: number

  @Column({ type: "int" })
  timingAccuracy: number // how close to perfect timing (in milliseconds)

  @Column({ type: "jsonb" })
  unlockDetails: {
    pulseScheduledTime: Date
    clientTimestamp: Date
    serverTimestamp: Date
    timeDifference: number
    networkLatency?: number
    ntpOffset?: number
  }

  @CreateDateColumn()
  createdAt: Date
}

@Entity("ntp_sync_logs")
export class NTPSyncLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column({ type: "timestamp with time zone" })
  clientSentTime: Date

  @Column({ type: "timestamp with time zone" })
  serverReceivedTime: Date

  @Column({ type: "timestamp with time zone" })
  serverSentTime: Date

  @Column({ type: "timestamp with time zone" })
  clientReceivedTime: Date

  @Column({ type: "int" })
  roundTripTime: number // in milliseconds

  @Column({ type: "int" })
  clockOffset: number // in milliseconds

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    userAgent?: string
    ipAddress?: string
    timeZone?: string
  }

  @CreateDateColumn()
  createdAt: Date
}

@Entity("timesync_config")
export class TimeSyncConfig {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ default: "12:00:00" })
  dailyPulseTime: string // HH:MM:SS format

  @Column({ default: "UTC" })
  pulseTimeZone: string

  @Column({ type: "int", default: 3000 })
  syncWindowMs: number // ±3 seconds

  @Column({ type: "int", default: 5000 })
  maxNetworkLatency: number // maximum allowed network latency

  @Column({ default: true })
  enableNTPSync: boolean

  @Column({ default: true })
  enableDailyPulses: boolean

  @Column({ default: true })
  @Index()
  isActive: boolean

  @Column({ nullable: true })
  description: string

  @Column({ type: "jsonb", nullable: true })
  advancedSettings: {
    ntpServers?: string[]
    timeDriftThreshold?: number
    maxSyncAttempts?: number
    pulsePreannounceMs?: number
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
