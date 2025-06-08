import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm"
import { PhotoTheme } from "./photo-theme.entity"

@Entity("daily_themes")
@Index(["date", "userId"], { unique: true })
export class DailyTheme {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid" })
  themeId: string

  @Column({ type: "date" })
  date: Date

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => PhotoTheme)
  @JoinColumn({ name: "themeId" })
  theme: PhotoTheme
}
