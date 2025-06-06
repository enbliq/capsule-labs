import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { EmotionType } from "../enums/emotion-type.enum"

@Entity("emotion_capsules")
export class EmotionCapsule {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  title: string

  @Column({ type: "text" })
  content: string

  @Column({ type: "varchar", length: 255, nullable: true })
  userId: string

  @Column({
    type: "enum",
    enum: EmotionType,
    default: EmotionType.HAPPY,
  })
  targetEmotion: EmotionType

  @Column({ type: "float", default: 0.7 })
  detectionConfidence: number

  @Column({ type: "boolean", default: false })
  unlocked: boolean

  @Column({ type: "int", default: 0 })
  unlockAttempts: number

  @Column({ type: "timestamp", nullable: true })
  lastUnlockAttempt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Method to check if an emotion matches the target with sufficient confidence
  matchesEmotion(emotion: string, confidence: number): boolean {
    return emotion.toLowerCase() === this.targetEmotion.toLowerCase() && confidence >= this.detectionConfidence
  }
}
