import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { ArchiveCapsule } from "./archive-capsule.entity"
import { MediaSession } from "./media-session.entity"

export enum MediaEventType {
  PLAY = "play",
  PAUSE = "pause",
  SEEK = "seek",
  COMPLETE = "complete",
  BUFFER = "buffer",
  ERROR = "error",
  VOLUME_CHANGE = "volume_change",
  FULLSCREEN = "fullscreen",
  EXIT_FULLSCREEN = "exit_fullscreen",
}

@Entity("media_engagements")
export class MediaEngagement {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  userId: string

  @Column()
  capsuleId: string

  @Column()
  sessionId: string

  @Column({
    type: "enum",
    enum: MediaEventType,
  })
  eventType: MediaEventType

  @Column("float")
  currentTime: number

  @Column("float", { nullable: true })
  previousTime: number

  @Column("float", { nullable: true })
  duration: number

  @Column("float", { nullable: true })
  playbackRate: number

  @Column("float", { nullable: true })
  volume: number

  @Column("text", { nullable: true })
  metadata: string

  @ManyToOne(
    () => ArchiveCapsule,
    (capsule) => capsule.mediaEngagements,
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: ArchiveCapsule

  @ManyToOne(
    () => MediaSession,
    (session) => session.engagements,
  )
  @JoinColumn({ name: "sessionId" })
  session: MediaSession

  @CreateDateColumn()
  createdAt: Date
}
