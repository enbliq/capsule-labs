import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm"
import { ArchiveCapsule } from "./archive-capsule.entity"
import { MediaEngagement } from "./media-engagement.entity"

@Entity("media_sessions")
export class MediaSession {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  userId: string

  @Column()
  capsuleId: string

  @Column("int", { default: 0 })
  totalPlayTimeSeconds: number

  @Column("int", { default: 0 })
  totalPauseTimeSeconds: number

  @Column("float", { default: 0 })
  maxPositionReached: number

  @Column("float", { default: 0 })
  completionPercentage: number

  @Column({ default: false })
  completed: boolean

  @Column({ default: true })
  active: boolean

  @Column("text", { nullable: true })
  userAgent: string

  @Column({ nullable: true })
  ipAddress: string

  @ManyToOne(
    () => ArchiveCapsule,
    (capsule) => capsule.mediaSessions,
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: ArchiveCapsule

  @OneToMany(
    () => MediaEngagement,
    (engagement) => engagement.session,
  )
  engagements: MediaEngagement[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
