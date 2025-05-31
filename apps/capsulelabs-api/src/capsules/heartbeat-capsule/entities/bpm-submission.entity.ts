import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { HeartbeatCapsule } from "./heartbeat-capsule.entity"

@Entity("bpm_submissions")
export class BpmSubmission {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  userId: string

  @Column("int")
  bpm: number

  @Column()
  successful: boolean

  @Column()
  capsuleId: string

  @ManyToOne(
    () => HeartbeatCapsule,
    (capsule) => capsule.bpmSubmissions,
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: HeartbeatCapsule

  @CreateDateColumn()
  createdAt: Date
}
