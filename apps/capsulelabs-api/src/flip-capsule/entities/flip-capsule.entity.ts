import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

@Entity("flip_sessions")
export class FlipSession {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column({ type: "timestamp with time zone" })
  startTime: Date

  @Column({ type: "timestamp with time zone", nullable: true })
  endTime: Date

  @Column({ type: "int" })
  requiredDuration: number // in milliseconds

  @Column({ default: false })
  isComplete: boolean

  @Column({ default: false })
  @Index()
  capsuleUnlocked: boolean

  @Column({ type: "timestamp with time zone", nullable: true })
  capsuleUnlockedAt: Date

  @Column({ type: "jsonb", nullable: true })
  deviceInfo: Record<string, any>

  @Column({ type: "jsonb", nullable: true })
  orientationData: {
    initialOrientation?: {
      alpha: number
      beta: number
      gamma: number
    }
    finalOrientation?: {
      alpha: number
      beta: number
      gamma: number
    }
    orientationChanges?: number
    stabilityScore?: number
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity("flip_attempts")
export class FlipAttempt {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  sessionId: string

  @Column()
  @Index()
  userId: string

  @Column({ type: "timestamp with time zone" })
  attemptTime: Date

  @Column({ type: "int" })
  durationMs: number // How long the phone was flipped

  @Column({ default: false })
  wasSuccessful: boolean

  @Column({ type: "jsonb", nullable: true })
  orientationData: {
    startOrientation: {
      alpha: number
      beta: number
      gamma: number
    }
    endOrientation: {
      alpha: number
      beta: number
      gamma: number
    }
    maxDeviation: {
      alpha: number
      beta: number
      gamma: number
    }
  }

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    deviceType?: string
    browser?: string
    operatingSystem?: string
    sensorAccuracy?: string
    ipAddress?: string
  }

  @CreateDateColumn()
  createdAt: Date
}

@Entity("flip_capsule_unlocks")
export class FlipCapsuleUnlock {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column()
  sessionId: string

  @Column({ type: "timestamp with time zone" })
  unlockedAt: Date

  @Column({ type: "int" })
  totalAttempts: number

  @Column({ type: "int" })
  sessionDurationSeconds: number

  @Column({ type: "jsonb" })
  unlockDetails: {
    deviceInfo?: Record<string, any>
    orientationData?: Record<string, any>
    attemptIds?: string[]
  }

  @CreateDateColumn()
  createdAt: Date
}

@Entity("flip_challenge_config")
export class FlipChallengeConfig {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "int", default: 30000 })
  requiredDuration: number // 30 seconds in milliseconds

  @Column({ type: "float", default: 150 })
  betaThreshold: number // Beta angle threshold for "flipped" state

  @Column({ type: "float", default: 0 })
  gammaThreshold: number // Gamma angle threshold

  @Column({ type: "float", default: 15 })
  stabilityThreshold: number // Maximum movement allowed while maintaining "flipped" state

  @Column({ default: false })
  requireAbsoluteSensors: boolean

  @Column({ default: true })
  isActive: boolean

  @Column({ nullable: true })
  name: string

  @Column({ nullable: true })
  description: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
