import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import type { ReactionChallengeService } from "./reaction-challenge.service"

@ApiTags("Reaction Challenge")
@Controller("reaction-challenge")
export class ReactionChallengeController {
  constructor(private readonly reactionChallengeService: ReactionChallengeService) {}

  @Post("create")
  @ApiOperation({ summary: "Create a new reaction challenge" })
  @ApiResponse({ status: 201, description: "Challenge created successfully" })
  async createChallenge(@Body() { userId, triggerType = "visual" }: { userId: string; triggerType?: "sound" | "visual" }) {
    try {
      return this.reactionChallengeService.createChallenge(userId, triggerType)
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Post(":challengeId/trigger")
  @ApiOperation({ summary: "Generate a trigger for a challenge" })
  @ApiResponse({ status: 200, description: "Trigger generated successfully" })
  async generateTrigger(@Param("challengeId") challengeId: string) {
    try {
      const delay = await this.reactionChallengeService.generateTrigger(challengeId)
      return { 
        challengeId, 
        delay,
        message: `Trigger will be generated after ${delay}ms`
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Post(":challengeId/react")
  @ApiOperation({ summary: "Process user's reaction to a trigger" })
  @ApiResponse({ status: 200, description: "Reaction processed" })
  async processReaction(@Param("challengeId") challengeId: string, @Body() body: { timestamp: number }) {
    try {
      const { timestamp } = body
      return this.reactionChallengeService.processReaction(challengeId, timestamp)
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Get(":challengeId/status")
  @ApiOperation({ summary: "Get the current status of a challenge" })
  @ApiResponse({ status: 200, description: "Challenge status" })
  async getChallengeStatus(@Param("challengeId") challengeId: string) {
    const challenge = this.reactionChallengeService.getChallengeStatus(challengeId)
    
    if (!challenge) {
      throw new HttpException("Challenge not found", HttpStatus.NOT_FOUND)
    }
    
    return challenge
  }

  @Get("health")
  @ApiOperation({ summary: "Health check for reaction challenge service" })
  healthCheck() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "reaction-challenge",
    }
  }
}
