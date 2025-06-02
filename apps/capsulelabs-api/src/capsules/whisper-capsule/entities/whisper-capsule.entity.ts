import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { WeatherCheck } from "./weather-check.entity"

export enum WeatherType {
  CLEAR = "clear",
  CLOUDS = "clouds",
  RAIN = "rain",
  DRIZZLE = "drizzle",
  THUNDERSTORM = "thunderstorm",
  SNOW = "snow",
  MIST = "mist",
  FOG = "fog",
  HAZE = "haze",
}

export enum TemperatureOperator {
  ABOVE = "above",
  BELOW = "below",
  BETWEEN = "between",
  EQUALS = "equals",
}

@Entity("whisper_capsules")
export class WhisperCapsule {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column("text")
  content: string

  @Column()
  userId: string

  @Column("float")
  latitude: number

  @Column("float")
  longitude: number

  @Column()
  locationName: string

  @Column({
    type: "enum",
    enum: WeatherType,
    nullable: true,
  })
  requiredWeatherType: WeatherType

  @Column({
    type: "enum",
    enum: TemperatureOperator,
    nullable: true,
  })
  temperatureOperator: TemperatureOperator

  @Column("float", { nullable: true })
  temperatureValue: number

  @Column("float", { nullable: true })
  temperatureValueMax: number

  @Column({ default: false })
  unlocked: boolean

  @Column({ nullable: true })
  unlockedAt: Date

  @Column({ default: 0 })
  checkCount: number

  @OneToMany(
    () => WeatherCheck,
    (check) => check.capsule,
  )
  weatherChecks: WeatherCheck[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
