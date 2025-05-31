import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ApiProperty } from "@nestjs/swagger"

@Entity("location_lock_capsules")
export class LocationLockCapsule {
  @ApiProperty({
    description: "Unique identifier for the capsule",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string

  @ApiProperty({
    description: "Title of the capsule",
    example: "Secret Message at Central Park",
  })
  @Column({ type: "varchar", length: 255 })
  title: string

  @ApiProperty({
    description: "Content of the capsule (only accessible when unlocked)",
    example: "Congratulations! You found the hidden treasure!",
  })
  @Column({ type: "text" })
  content: string

  @ApiProperty({
    description: "User ID who created the capsule",
    example: "user123",
  })
  @Column({ type: "varchar", length: 255 })
  userId: string

  @ApiProperty({
    description: "Latitude coordinate for the lock location",
    example: 40.7829,
  })
  @Column({ type: "decimal", precision: 10, scale: 8 })
  lockLatitude: number

  @ApiProperty({
    description: "Longitude coordinate for the lock location",
    example: -73.9654,
  })
  @Column({ type: "decimal", precision: 11, scale: 8 })
  lockLongitude: number

  @ApiProperty({
    description: "Allowed radius in meters for unlocking",
    example: 20,
    default: 20,
  })
  @Column({ type: "int", default: 20 })
  allowedRadiusMeters: number

  @ApiProperty({
    description: "When the capsule was created",
  })
  @CreateDateColumn()
  createdAt: Date

  @ApiProperty({
    description: "When the capsule was last updated",
  })
  @UpdateDateColumn()
  updatedAt: Date
}
