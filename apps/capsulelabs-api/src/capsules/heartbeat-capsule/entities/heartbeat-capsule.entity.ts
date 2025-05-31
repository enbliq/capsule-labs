import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { BpmSubmission } from "./bpm-submission.entity"

@Entity("heartbeat_capsules")
export class HeartbeatCapsule {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column("text")
  content: string

  @Column()
  userId: string

  @Column("int")
  targetMinBpm: number

  @Column("int")
  targetMaxBpm: number

  @OneToMany(
    () => BpmSubmission,
    (submission) => submission.capsule,
  )
  bpmSubmissions: BpmSubmission[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
