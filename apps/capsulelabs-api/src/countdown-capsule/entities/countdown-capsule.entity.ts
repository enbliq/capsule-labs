import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("countdown_capsules")
export class CountdownCapsule {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  title: string

  @Column({ type: "text", nullable: true })
  content: string

  @Column({ type: "int" })
  durationMinutes: number

  @Column({ type: "timestamp", nullable: true })
  unlockAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ type: "boolean", default: false })
  started: boolean

  @Column({ type: "boolean", default: false })
  unlocked: boolean

  @Column({ type: "varchar", length: 255, nullable: true })
  createdBy: string // User ID or identifier

  // Virtual property to check if capsule is expired
  get isExpired(): boolean {
    if (!this.started || !this.unlockAt) {
      return false
    }
    return new Date() >= this.unlockAt
  }

  // Virtual property to get remaining time in milliseconds
  get remainingTime(): number {
    if (!this.started || !this.unlockAt) {
      return this.durationMinutes * 60 * 1000
    }
    const remaining = this.unlockAt.getTime() - new Date().getTime()
    return Math.max(0, remaining)
  }
}
