import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { TokenReward, RewardStatus, RewardType } from "../entities/token-reward.entity"

@Injectable()
export class TokenRewardService {
  private readonly logger = new Logger(TokenRewardService.name)

  constructor(private readonly tokenRewardRepository: Repository<TokenReward> = InjectRepository(TokenReward)) {}

  async createReward(
    userId: string,
    type: RewardType,
    amount: number,
    attemptId?: string,
    walletAddress?: string,
    metadata?: Record<string, any>,
  ): Promise<TokenReward> {
    const reward = this.tokenRewardRepository.create({
      userId,
      attemptId,
      type,
      amount,
      walletAddress,
      metadata,
      status: RewardStatus.PENDING,
    })

    const savedReward = await this.tokenRewardRepository.save(reward)

    this.logger.log(`Token reward created: ${savedReward.id} for user ${userId}, amount: ${amount} STRK`)

    return savedReward
  }

  async processFallbackReward(userId: string, walletAddress?: string): Promise<TokenReward> {
    const fallbackAmount = 50 // Default fallback reward amount

    const reward = await this.createReward(
      userId,
      RewardType.FALLBACK_REWARD,
      fallbackAmount,
      undefined,
      walletAddress,
      {
        reason: "No capsule available for completed challenge",
        timestamp: new Date().toISOString(),
      },
    )

    // Process the reward immediately for fallback
    return this.processReward(reward.id)
  }

  async processChallengeCompletionReward(
    userId: string,
    attemptId: string,
    amount: number,
    walletAddress?: string,
  ): Promise<TokenReward> {
    const reward = await this.createReward(userId, RewardType.CHALLENGE_COMPLETION, amount, attemptId, walletAddress, {
      reason: "Challenge completed successfully",
      timestamp: new Date().toISOString(),
    })

    return this.processReward(reward.id)
  }

  async processReward(rewardId: string): Promise<TokenReward> {
    const reward = await this.tokenRewardRepository.findOne({
      where: { id: rewardId },
    })

    if (!reward) {
      throw new Error("Reward not found")
    }

    if (reward.status !== RewardStatus.PENDING) {
      throw new Error("Reward is not in pending status")
    }

    try {
      reward.status = RewardStatus.PROCESSING
      await this.tokenRewardRepository.save(reward)

      // Simulate STRK token transfer
      const transactionHash = await this.transferSTRKTokens(reward.walletAddress || "default", reward.amount)

      reward.status = RewardStatus.COMPLETED
      reward.transactionHash = transactionHash
      reward.processedAt = new Date()

      const processedReward = await this.tokenRewardRepository.save(reward)

      this.logger.log(`Token reward processed: ${rewardId}, tx: ${transactionHash}`)

      return processedReward
    } catch (error) {
      reward.status = RewardStatus.FAILED
      reward.failureReason = error instanceof Error ? error.message : "Unknown error"
      await this.tokenRewardRepository.save(reward)

      this.logger.error(`Token reward processing failed: ${rewardId}`, error)
      throw error
    }
  }

  private async transferSTRKTokens(walletAddress: string, amount: number): Promise<string> {
    // Mock STRK token transfer implementation
    // In a real implementation, this would interact with Starknet
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate network delay

    // Generate mock transaction hash
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`

    this.logger.log(`Mock STRK transfer: ${amount} tokens to ${walletAddress}, tx: ${mockTxHash}`)

    return mockTxHash
  }

  async getUserRewards(userId: string): Promise<TokenReward[]> {
    return this.tokenRewardRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    })
  }

  async getPendingRewards(): Promise<TokenReward[]> {
    return this.tokenRewardRepository.find({
      where: { status: RewardStatus.PENDING },
      order: { createdAt: "ASC" },
    })
  }

  async getRewardStats(userId: string): Promise<{
    totalEarned: number
    totalPending: number
    totalFailed: number
    rewardsByType: Record<RewardType, number>
  }> {
    const rewards = await this.getUserRewards(userId)

    const totalEarned = rewards.filter((r) => r.status === RewardStatus.COMPLETED).reduce((sum, r) => sum + r.amount, 0)

    const totalPending = rewards
      .filter((r) => r.status === RewardStatus.PENDING || r.status === RewardStatus.PROCESSING)
      .reduce((sum, r) => sum + r.amount, 0)

    const totalFailed = rewards.filter((r) => r.status === RewardStatus.FAILED).length

    const rewardsByType = rewards.reduce(
      (acc, reward) => {
        if (reward.status === RewardStatus.COMPLETED) {
          acc[reward.type] = (acc[reward.type] || 0) + reward.amount
        }
        return acc
      },
      {} as Record<RewardType, number>,
    )

    return {
      totalEarned,
      totalPending,
      totalFailed,
      rewardsByType,
    }
  }

  async retryFailedReward(rewardId: string): Promise<TokenReward> {
    const reward = await this.tokenRewardRepository.findOne({
      where: { id: rewardId },
    })

    if (!reward) {
      throw new Error("Reward not found")
    }

    if (reward.status !== RewardStatus.FAILED) {
      throw new Error("Reward is not in failed status")
    }

    reward.status = RewardStatus.PENDING
    reward.failureReason = null
    await this.tokenRewardRepository.save(reward)

    return this.processReward(rewardId)
  }
}
