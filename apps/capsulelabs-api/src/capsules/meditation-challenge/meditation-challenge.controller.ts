import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import type { MeditationChallengeService, MeditationSettings } from "./meditation-challenge.service"

@ApiTags("Meditation Challenge")
@Controller("meditation-challenge")
export class MeditationChallengeController {
  constructor(private readonly meditationChallengeService: MeditationChallengeService) {}

  @Post("create")
  @ApiOperation({ summary: "Create a new meditation session" })
  @ApiResponse({ status: 201, description: "Session created successfully" })
  async createSession(
    @Body()
    body: { 
      userId: string
      settings?: Partial<MeditationSettings>
    }
  ) {
    try {
      const { userId, settings } = body
      return this.meditationChallengeService.createSession(userId, settings)
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Post(":sessionId/start")
  @ApiOperation({ summary: "Start a meditation session" })
  @ApiResponse({ status: 200, description: "Session started successfully" })
  async startSession(@Param("sessionId") sessionId: string) {
    try {
      const result = this.meditationChallengeService.startSession(sessionId)
      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.BAD_REQUEST)
      }
      return result
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Post(":sessionId/pause")
  @ApiOperation({ summary: "Pause a meditation session" })
  @ApiResponse({ status: 200, description: "Session paused successfully" })
  async pauseSession(@Param("sessionId") sessionId: string, @Body() body: { reason?: string } = {}) {
    try {
      const result = this.meditationChallengeService.pauseSession(sessionId, body.reason)
      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.BAD_REQUEST)
      }
      return result
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Post(":sessionId/resume")
  @ApiOperation({ summary: "Resume a paused meditation session" })
  @ApiResponse({ status: 200, description: "Session resumed successfully" })
  async resumeSession(@Param("sessionId") sessionId: string) {
    try {
      const result = this.meditationChallengeService.resumeSession(sessionId)
      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.BAD_REQUEST)
      }
      return result
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Post(":sessionId/interruption")
  @ApiOperation({ summary: "Record an interruption during meditation" })
  @ApiResponse({ status: 200, description: "Interruption recorded" })
  async recordInterruption(
    @Param("sessionId") sessionId: string,
    @Body() body: {
      type: "movement" | "noise" | "screen_exit"
      severity?: "low" | "medium" | "high"
      description?: string
    },
  ) {
    try {
      const { type, severity = "medium", description = "" } = body
      return this.meditationChallengeService.recordInterruption(sessionId, type, severity, description)
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Post(":sessionId/end")
  @ApiOperation({ summary: "End a meditation session manually" })
  @ApiResponse({ status: 200, description: "Session ended" })
  async endSession(@Param("sessionId") sessionId: string) {
    try {
      return this.meditationChallengeService.endSession(sessionId)
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Get(":sessionId/status")
  @ApiOperation({ summary: "Get the current status of a meditation session" })
  @ApiResponse({ status: 200, description: "Session status" })
  async getSessionStatus(@Param("sessionId") sessionId: string) {
    const session = this.meditationChallengeService.getSessionStatus(sessionId)
    
    if (!session) {
      throw new HttpException("Session not found", HttpStatus.NOT_FOUND)
    }
    
    return session
  }

  @Get("user/:userId/sessions")
  @ApiOperation({ summary: "Get completed sessions for a user" })
  @ApiResponse({ status: 200, description: "User sessions" })
  async getUserSessions(@Param("userId") userId: string) {
    return {
      userId,
      sessions: this.meditationChallengeService.getUserCompletedSessions(userId),
    }
  }

  @Get("user/:userId/statistics")
  @ApiOperation({ summary: "Get meditation statistics for a user" })
  @ApiResponse({ status: 200, description: "User statistics" })
  async getUserStatistics(@Param("userId") userId: string) {
    return {
      userId,
      statistics: this.meditationChallengeService.getUserStatistics(userId),
      timestamp: new Date().toISOString(),
    }
  }

  @Get("health")
  @ApiOperation({ summary: "Health check for meditation challenge service" })
  healthCheck() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "meditation-challenge",
    }
  }
}
