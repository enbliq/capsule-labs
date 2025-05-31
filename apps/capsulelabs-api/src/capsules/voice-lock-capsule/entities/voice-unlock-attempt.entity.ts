import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { VoiceLockCapsule } from "./voice-lock-capsule.entity"

@Entity("voice_unlock_attempts")
export class VoiceUnlockAttempt {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  userId: string

  @Column()
  capsuleId: string

  @Column()
  recognizedText: string

  @Column("float")
  confidenceScore: number

  @Column("float")
  voiceMatchScore: number

  @Column()
  successful: boolean

  @ManyToOne(
    () => VoiceLockCapsule,
    (capsule) => capsule.unlockAttempts,
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: VoiceLockCapsule

  @CreateDateColumn()
  createdAt: Date
}
