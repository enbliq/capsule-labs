import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { SenseType, TaskType } from "../dto/sense-task.dto"

@Entity("sense_tasks")
export class SenseTask {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({
    type: "enum",
    enum: SenseType,
  })
  sense: SenseType

  @Column({
    type: "enum",
    enum: TaskType,
  })
  taskType: TaskType

  @Column()
  title: string

  @Column("text")
  description: string

  @Column("jsonb", { nullable: true })
  metadata: Record<string, any>

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity("user_sense_progress")
export class UserSenseProgress {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  userId: string

  @Column("date")
  date: Date

  @Column("jsonb")
  dailyTasks: {
    taskId: string
    sense: SenseType
    taskType: TaskType
    completed: boolean
    completedAt?: Date
    taskData?: Record<string, any>
  }[]

  @Column({ default: false })
  capsuleUnlocked: boolean

  @Column({ nullable: true })
  capsuleUnlockedAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
