import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

export enum ThemeCategory {
  COLOR = "color",
  OBJECT = "object",
  EMOTION = "emotion",
  NATURE = "nature",
  ABSTRACT = "abstract",
  ACTIVITY = "activity",
}

@Entity("photo_themes")
export class PhotoTheme {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  name: string

  @Column({ type: "text" })
  description: string

  @Column({
    type: "enum",
    enum: ThemeCategory,
  })
  category: ThemeCategory

  @Column({ type: "text", array: true })
  keywords: string[]

  @Column({ type: "boolean", default: true })
  isActive: boolean

  @Column({ type: "int", default: 0 })
  usageCount: number

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
