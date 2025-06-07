import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"
import { PetType, VerificationStatus } from "../dto/pet-upload.dto"

@Entity("pet_uploads")
export class PetUpload {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column()
  originalFileName: string

  @Column()
  storedFileName: string

  @Column()
  filePath: string

  @Column()
  mimeType: string

  @Column({ type: "bigint" })
  fileSize: number

  @Column({ type: "smallint", nullable: true })
  imageWidth: number

  @Column({ type: "smallint", nullable: true })
  imageHeight: number

  @Column({ nullable: true })
  petName: string

  @Column({
    type: "enum",
    enum: PetType,
    nullable: true,
  })
  expectedPetType: PetType

  @Column("text", { nullable: true })
  description: string

  @Column("simple-array", { nullable: true })
  tags: string[]

  @Column({
    type: "enum",
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  @Index()
  verificationStatus: VerificationStatus

  @Column({ default: false })
  @Index()
  capsuleUnlocked: boolean

  @Column({ type: "timestamp with time zone", nullable: true })
  capsuleUnlockedAt: Date

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    uploadSource?: string
    deviceInfo?: string
    location?: string
    ipAddress?: string
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity("pet_classifications")
export class PetClassification {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  uploadId: string

  @Column({
    type: "enum",
    enum: PetType,
  })
  predictedPetType: PetType

  @Column({ type: "decimal", precision: 5, scale: 4 })
  confidence: number

  @Column("jsonb")
  allPredictions: Array<{
    petType: PetType
    confidence: number
  }>

  @Column({ type: "smallint" })
  processingTimeMs: number

  @Column()
  modelVersion: string

  @Column()
  modelProvider: string // 'tensorflow', 'custom', 'fallback'

  @Column({ default: true })
  @Index()
  isActive: boolean

  @Column({ type: "jsonb", nullable: true })
  technicalDetails: {
    imagePreprocessing?: any
    modelInputs?: any
    rawOutputs?: any
    errorDetails?: any
  }

  @CreateDateColumn()
  createdAt: Date
}

@Entity("manual_verifications")
export class ManualVerification {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  uploadId: string

  @Column()
  @Index()
  reviewerId: string

  @Column({
    type: "enum",
    enum: VerificationStatus,
  })
  decision: VerificationStatus

  @Column("text", { nullable: true })
  reviewNotes: string

  @Column({
    type: "enum",
    enum: PetType,
    nullable: true,
  })
  correctedPetType: PetType

  @Column({ type: "decimal", precision: 5, scale: 4, nullable: true })
  confidenceOverride: number

  @Column({ type: "smallint" })
  reviewTimeSeconds: number

  @Column({ type: "jsonb", nullable: true })
  reviewMetadata: {
    reviewerExperience?: string
    reviewDifficulty?: number
    flaggedIssues?: string[]
  }

  @CreateDateColumn()
  createdAt: Date
}

@Entity("pet_capsule_unlocks")
export class PetCapsuleUnlock {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column()
  uploadId: string

  @Column({
    type: "enum",
    enum: PetType,
  })
  petType: PetType

  @Column({ type: "decimal", precision: 5, scale: 4 })
  finalConfidence: number

  @Column()
  unlockMethod: string // 'auto_ml', 'manual_verification', 'admin_override'

  @Column({ type: "timestamp with time zone" })
  unlockedAt: Date

  @Column({ type: "jsonb" })
  unlockDetails: {
    classificationId?: string
    verificationId?: string
    processingTime?: number
    reviewTime?: number
  }

  @CreateDateColumn()
  createdAt: Date
}
