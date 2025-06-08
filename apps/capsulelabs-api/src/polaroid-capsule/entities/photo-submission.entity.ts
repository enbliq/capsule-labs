import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm"
import { DailyTheme } from "./daily-theme.entity"

export enum SubmissionStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity("photo_submissions")
export class PhotoSubmission {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  @Index()
  userId: string

  @Column({ type: "uuid" })
  dailyThemeId: string

  @Column({ type: "varchar", length: 255 })
  photoUrl: string

  @Column({ type: "varchar", length: 255, nullable: true })
  thumbnailUrl: string

  @Column({ type: "text", nullable: true })
  caption: string

  @Column({
    type: "enum",
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  status: SubmissionStatus

  @Column({ type: "jsonb", nullable: true })
  detectionResults: Record<string, any>

  @Column({ type: "float", nullable: true })
  confidenceScore: number

  @Column({ type: "text", nullable: true })
  rejectionReason: string

  @Column({ type: "uuid", nullable: true })
  reviewedBy: string

  @Column({ type: "timestamp", nullable: true })
  reviewedAt: Date

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  submittedAt: Date

  @Column({ type: "date" })
  @Index()
  submissionDate: Date

  @ManyToOne(() => DailyTheme)
  @JoinColumn({ name: "dailyThemeId" })
  dailyTheme: DailyTheme
}
