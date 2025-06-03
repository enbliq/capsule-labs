import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import type { ChallengeAttempt } from "./challenge-attempt.entity"

@Entity("gps_points")
export class GPSPoint {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("uuid")
  attemptId: string

  @ManyToOne("ChallengeAttempt", "gpsPoints")
  @JoinColumn({ name: "attemptId" })
  attempt: ChallengeAttempt

  @Column("decimal", { precision: 10, scale: 6 })
  latitude: number

  @Column("decimal", { precision: 10, scale: 6 })
  longitude: number

  @Column("decimal", { precision: 5, scale: 2, nullable: true })
  altitude: number

  @Column("decimal", { precision: 5, scale: 2, nullable: true })
  accuracy: number // meters

  @Column("decimal", { precision: 5, scale: 2, nullable: true })
  speed: number // m/s

  @Column("decimal", { precision: 5, scale: 2, nullable: true })
  bearing: number // degrees

  @Column("timestamp")
  timestamp: Date

  @CreateDateColumn()
  createdAt: Date
}
