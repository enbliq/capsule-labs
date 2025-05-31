import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { VoiceUnlockAttempt } from "./voice-unlock-attempt.entity"

@Entity("voice_lock_capsules")
export class VoiceLockCapsule {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column("text")
  content: string

  @Column()
  userId: string

  @Column()
  passphrase: string

  @Column()
  voicePrintHash: string

  @Column({ default: false })
  caseSensitive: boolean

  @Column({ default: 0.7 })
  confidenceThreshold: number

  @OneToMany(
    () => VoiceUnlockAttempt,
    (attempt) => attempt.capsule,
  )
  unlockAttempts: VoiceUnlockAttempt[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
