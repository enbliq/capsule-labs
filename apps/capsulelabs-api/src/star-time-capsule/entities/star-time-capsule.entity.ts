import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { AstronomicalEventType } from "../enums/astronomical-event.enum"

@Entity("star_time_capsules")
export class StarTimeCapsule {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({
    type: "enum",
    enum: AstronomicalEventType,
    comment: "Type of astronomical event that triggers unlock",
  })
  eventType: AstronomicalEventType

  @Column({
    type: "timestamp with time zone",
    comment: "Expected date and time of the astronomical event",
  })
  expectedDate: Date

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
    comment: "Content of the time capsule",
  })
  content: string | null

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "Title or name of the time capsule",
  })
  title: string | null

  @Column({
    type: "varchar",
    length: 100,
    nullable: true,
    comment: "Creator or owner of the time capsule",
  })
  createdBy: string | null

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
