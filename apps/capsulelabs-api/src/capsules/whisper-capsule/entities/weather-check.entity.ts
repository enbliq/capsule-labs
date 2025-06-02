import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { WhisperCapsule } from "./whisper-capsule.entity"

@Entity("weather_checks")
export class WeatherCheck {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  userId: string

  @Column()
  capsuleId: string

  @Column("float")
  actualTemperature: number

  @Column()
  actualWeatherType: string

  @Column()
  actualWeatherDescription: string

  @Column("float")
  humidity: number

  @Column("float")
  pressure: number

  @Column("float")
  windSpeed: number

  @Column()
  conditionMet: boolean

  @Column("text", { nullable: true })
  weatherApiResponse: string

  @ManyToOne(
    () => WhisperCapsule,
    (capsule) => capsule.weatherChecks,
  )
  @JoinColumn({ name: "capsuleId" })
  capsule: WhisperCapsule

  @CreateDateColumn()
  createdAt: Date
}
