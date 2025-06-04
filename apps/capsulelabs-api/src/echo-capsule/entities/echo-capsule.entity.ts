import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { SoundPattern } from "../enums/sound-pattern.enum"

@Entity("echo_capsules")
export class EchoCapsule {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({
    type: "enum",
    enum: SoundPattern,
    comment: "Type of sound pattern that triggers unlock",
  })
  soundPattern: SoundPattern

  @Column({
    type: "boolean",
    default: false,
    comment: "Whether the capsule has been unlocked",
  })
  unlocked: boolean

  @Column({
    type: "timestamp with time zone",
    nullable: true,
    comment: "Date and time when the capsule was unlocked",
  })
  unlockedAt: Date | null

  @Column({
    type: "text",
    nullable: true,
    comment: "Content of the echo capsule",
  })
  content: string | null

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "Title or name of the echo capsule",
  })
  title: string | null

  @Column({
    type: "varchar",
    length: 100,
    nullable: true,
    comment: "Creator or owner of the echo capsule",
  })
  createdBy: string | null

  @Column({
    type: "float",
    default: 0.8,
    comment: "Confidence threshold for sound detection (0.0 - 1.0)",
  })
  confidenceThreshold: number

  @Column({
    type: "json",
    nullable: true,
    comment: "Audio fingerprint data for the target sound",
  })
  audioFingerprint: any

  @Column({
    type: "json",
    nullable: true,
    comment: "Metadata about unlock attempts",
  })
  unlockAttempts: any[]

  @Column({
    type: "varchar",
    length: 500,
    nullable: true,
    comment: "Path to the reference audio file",
  })
  referenceAudioPath: string | null

  @CreateDateColumn({
    type: "timestamp with time zone",
    comment: "Date and time when the capsule was created",
  })
  createdAt: Date

  @UpdateDateColumn({
    type: "timestamp with time zone",
    comment: "Date and time when the capsule was last updated",
  })
  updatedAt: Date
}
