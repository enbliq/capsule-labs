import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

@Entity("daily_check_ins")
@Index(["userId", "checkInDate"], { unique: true })
export class DailyCheckIn {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "date" })
  checkInDate: Date

  @Column({ type: "varchar", length: 50, default: "UTC" })
  timezone: string

  @Column({ type: "int", default: 1 })
  streakDay: number

  @Column({ type: "boolean", default: false })
  isGracePeriod: boolean

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date
}
