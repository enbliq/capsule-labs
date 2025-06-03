import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

export enum RewardStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum RewardType {
  CHALLENGE_COMPLETION = "challenge_completion",
  FALLBACK_REWARD = "fallback_reward",
  BONUS_REWARD = "bonus_reward",
}

@Entity("token_rewards")
export class TokenReward {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("uuid")
  userId: string

  @Column("uuid", { nullable: true })
  attemptId: string

  @Column({
    type: "enum",
    enum: RewardType,
  })
  type: RewardType

  @Column("int")
  amount: number // STRK tokens

  @Column({
    type: "enum",
    enum: RewardStatus,
    default: RewardStatus.PENDING,
  })
  status: RewardStatus

  @Column("text", { nullable: true })
  transactionHash: string

  @Column("text", { nullable: true })
  walletAddress: string

  @Column("timestamp", { nullable: true })
  processedAt: Date

  @Column("text", { nullable: true })
  failureReason: string

  @Column("jsonb", { nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
