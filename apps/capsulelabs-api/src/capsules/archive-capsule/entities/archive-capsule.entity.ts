import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { MediaEngagement } from "./media-engagement.entity"
import { MediaSession } from "./media-session.entity"

export enum MediaType {
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
  IMAGE = "image",
  INTERACTIVE = "interactive",
}

@Entity("archive_capsules")
export class ArchiveCapsule {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column("text")
  content: string

  @Column()
  userId: string

  @Column()
  mediaUrl: string

  @Column()
  mediaTitle: string

  @Column({
    type: "enum",
    enum: MediaType,
  })
  mediaType: MediaType

  @Column("int")
  mediaDurationSeconds: number

  @Column("int")
  minimumEngagementSeconds: number

  @Column("float", { default: 0.8 })
  minimumCompletionPercentage: number

  @Column({ default: false })
  requireFullCompletion: boolean

  @Column({ default: true })
  allowPausing: boolean

  @Column("int", { default: 30 })
  maxPauseTimeSeconds: number

  @Column({ default: false })
  unlocked: boolean

  @Column({ nullable: true })
  unlockedAt: Date

  @Column("int", { default: 0 })
  totalEngagementSeconds: number

  @Column("float", { default: 0 })
  completionPercentage: number

  @OneToMany(
    () => MediaEngagement,
    (engagement) => engagement.capsule,
  )
  mediaEngagements: MediaEngagement[]

  @OneToMany(
    () => MediaSession,
    (session) => session.capsule,
  )
  mediaSessions: MediaSession[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
