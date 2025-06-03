import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { StepCapsule, StepCapsuleStatus } from "../entities/step-capsule.entity"
import type { StepChallengeService } from "./step-challenge.service"
import type { TokenRewardService } from "./token-reward.service"
import { AttemptStatus } from "../entities/challenge-attempt.entity"

@Injectable()
export class StepCapsuleService {
  private readonly logger = new Logger(StepCapsuleService.name);

  constructor(
    private readonly capsuleRepository: Repository<StepCapsule>,
    private readonly challengeService: StepChallengeService,
    private readonly tokenRewardService: TokenRewardService,
    @InjectRepository(StepCapsule)
  ) {}

  async createCapsule(
    userId: string,
    challengeId: string,
    title: string,
    content: string,
    description?: string,
  ): Promise<StepCapsule> {
    const challenge = await this.challengeService.getChallengeById(challengeId)

    const capsule = this.capsuleRepository.create({
      userId,
      challengeId,
      title,
      description,
      content,
      status: StepCapsuleStatus.LOCKED,
    })

    return this.capsuleRepository.save(capsule)
  }

  async getUserCapsules(userId: string): Promise<StepCapsule[]> {
    return this.capsuleRepository.find({
      where: { userId },
      relations: ["challenge"],
      order: { createdAt: "DESC" },
    })
  }

  async getCapsuleById(id: string, userId: string): Promise<StepCapsule> {
    const capsule = await this.capsuleRepository.findOne({
      where: { id, userId },
      relations: ["challenge"],
    })

    if (!capsule) {
      throw new NotFoundException("Capsule not found")
    }

    return capsule
  }

  async getAvailableCapsule(userId: string, challengeId: string): Promise<StepCapsule | null> {
    return this.capsuleRepository.findOne({
      where: {
        userId,
        challengeId,
        status: StepCapsuleStatus.LOCKED,
      },
      relations: ["challenge"],
    })
  }

  async handleChallengeCompletion(
    userId: string,
    attemptId: string,
    walletAddress?: string,
  ): Promise<{
    capsuleUnlocked: boolean
    capsule?: StepCapsule
    tokenReward?: any
    message: string
  }> {
    const attempt = await this.challengeService.getAttemptById(attemptId)

    if (attempt.status !== AttemptStatus.COMPLETED) {
      throw new Error("Challenge attempt is not completed")
    }

    if (attempt.userId !== userId) {
      throw new Error("Attempt does not belong to user")
    }

    // Check if there's an available capsule for this challenge
    const availableCapsule = await this.getAvailableCapsule(userId, attempt.challengeId)

    if (availableCapsule) {
      // Unlock the capsule
      const unlockedCapsule = await this.unlockCapsule(availableCapsule.id, attemptId)

      // Also give challenge completion reward
      const tokenReward = await this.tokenRewardService.processChallengeCompletionReward(
        userId,
        attemptId,
        attempt.challenge.rewardAmount,
        walletAddress,
      )

      this.logger.log(`Capsule unlocked for user ${userId}: ${unlockedCapsule.id}`)

      return {
        capsuleUnlocked: true,
        capsule: unlockedCapsule,
        tokenReward,
        message: "Challenge completed! Capsule unlocked and tokens rewarded.",
      }
    } else {
      // No capsule available, give fallback STRK reward
      const tokenReward = await this.tokenRewardService.processFallbackReward(userId, walletAddress)

      this.logger.log(`Fallback reward given to user ${userId}: ${tokenReward.amount} STRK`)

      return {
        capsuleUnlocked: false,
        tokenReward,
        message: "Challenge completed! No capsule available, but you've been rewarded with STRK tokens.",
      }
    }
  }

  private async unlockCapsule(capsuleId: string, attemptId: string): Promise<StepCapsule> {
    const capsule = await this.capsuleRepository.findOne({
      where: { id: capsuleId },
      relations: ["challenge"],
    })

    if (!capsule) {
      throw new NotFoundException("Capsule not found")
    }

    if (capsule.status !== StepCapsuleStatus.LOCKED) {
      throw new Error("Capsule is not locked")
    }

    const attempt = await this.challengeService.getAttemptById(attemptId)

    capsule.status = StepCapsuleStatus.UNLOCKED
    capsule.unlockedAt = new Date()
    capsule.unlockData = {
      attemptId,
      completedAt: attempt.completedAt,
      stepsTaken: attempt.currentSteps,
      distanceCovered: attempt.currentDistanceKm,
      routeProgress: attempt.routeProgress,
      unlockedAt: new Date().toISOString(),
    }

    return this.capsuleRepository.save(capsule)
  }

  async openCapsule(id: string, userId: string): Promise<StepCapsule> {
    const capsule = await this.getCapsuleById(id, userId)

    if (capsule.status !== StepCapsuleStatus.UNLOCKED) {
      throw new Error("Capsule is not unlocked yet")
    }

    capsule.status = StepCapsuleStatus.OPENED
    capsule.openedAt = new Date()

    return this.capsuleRepository.save(capsule)
  }

  async getCapsuleStats(userId: string): Promise<{
    total: number
    locked: number
    unlocked: number
    opened: number
    totalRewardsEarned: number
  }> {
    const capsules = await this.getUserCapsules(userId)
    const rewardStats = await this.tokenRewardService.getRewardStats(userId)

    return {
      total: capsules.length,
      locked: capsules.filter((c) => c.status === StepCapsuleStatus.LOCKED).length,
      unlocked: capsules.filter((c) => c.status === StepCapsuleStatus.UNLOCKED).length,
      opened: capsules.filter((c) => c.status === StepCapsuleStatus.OPENED).length,
      totalRewardsEarned: rewardStats.totalEarned,
    }
  }

  async getChallengeLeaderboard(challengeId: string): Promise<
    Array<{
      userId: string
      bestTime: number
      totalSteps: number
      completionCount: number
      lastCompleted: Date
    }>
  > {
    // This would typically involve a more complex query
    // For now, we'll return a mock implementation
    const attempts = await this.challengeService.getUserAttempts("all") // This would need to be modified

    // Group by user and calculate stats
    const userStats = new Map()

    for (const attempt of attempts) {
      if (attempt.challengeId !== challengeId || attempt.status !== AttemptStatus.COMPLETED) {
        continue
      }

      const userId = attempt.userId
      const completionTime = attempt.completedAt!.getTime() - attempt.startedAt.getTime()

      if (!userStats.has(userId)) {
        userStats.set(userId, {
          userId,
          bestTime: completionTime,
          totalSteps: attempt.currentSteps,
          completionCount: 1,
          lastCompleted: attempt.completedAt,
        })
      } else {
        const stats = userStats.get(userId)
        stats.bestTime = Math.min(stats.bestTime, completionTime)
        stats.totalSteps = Math.max(stats.totalSteps, attempt.currentSteps)
        stats.completionCount += 1
        stats.lastCompleted = new Date(Math.max(stats.lastCompleted.getTime(), attempt.completedAt!.getTime()))
      }
    }

    return Array.from(userStats.values()).sort((a, b) => a.bestTime - b.bestTime)
  }
}
