import { Controller, Post, Get, Body, Param, Put } from "@nestjs/common"
import type { StepCapsuleService } from "../services/step-capsule.service"
import type { TokenRewardService } from "../services/token-reward.service"
import type { CompleteChallengeDto } from "../dto/complete-challenge.dto"

@Controller("step-capsules")
export class StepCapsuleController {
  constructor(
    private readonly capsuleService: StepCapsuleService,
    private readonly tokenRewardService: TokenRewardService,
  ) {}

  @Post()
  async createCapsule(body: {
    userId: string
    challengeId: string
    title: string
    content: string
    description?: string
  }) {
    return this.capsuleService.createCapsule(body.userId, body.challengeId, body.title, body.content, body.description)
  }

  @Get("user/:userId")
  async getUserCapsules(@Param('userId') userId: string) {
    return this.capsuleService.getUserCapsules(userId)
  }

  @Get(":id/user/:userId")
  async getCapsule(@Param('id') id: string, @Param('userId') userId: string) {
    return this.capsuleService.getCapsuleById(id, userId)
  }

  @Post("complete-challenge")
  async completeChallenge(@Body() completeChallengeDto: CompleteChallengeDto) {
    return this.capsuleService.handleChallengeCompletion(
      completeChallengeDto.userId,
      completeChallengeDto.attemptId,
      completeChallengeDto.walletAddress,
    )
  }

  @Put(":id/open/:userId")
  async openCapsule(@Param('id') id: string, @Param('userId') userId: string) {
    return this.capsuleService.openCapsule(id, userId)
  }

  @Get("stats/:userId")
  async getCapsuleStats(@Param('userId') userId: string) {
    return this.capsuleService.getCapsuleStats(userId)
  }

  @Get("leaderboard/:challengeId")
  async getChallengeLeaderboard(@Param('challengeId') challengeId: string) {
    return this.capsuleService.getChallengeLeaderboard(challengeId)
  }

  @Get("rewards/user/:userId")
  async getUserRewards(@Param('userId') userId: string) {
    return this.tokenRewardService.getUserRewards(userId)
  }

  @Get("rewards/stats/:userId")
  async getRewardStats(@Param('userId') userId: string) {
    return this.tokenRewardService.getRewardStats(userId)
  }

  @Post("rewards/:id/retry")
  async retryFailedReward(@Param('id') rewardId: string) {
    return this.tokenRewardService.retryFailedReward(rewardId)
  }

  @Get("rewards/pending")
  async getPendingRewards() {
    return this.tokenRewardService.getPendingRewards()
  }
}
