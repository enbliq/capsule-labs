import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import type {
  FaceTrackingChallengeService,
  FaceTrackingSettings,
  FacePosition,
  FaceLandmarks,
} from "./face-tracking-challenge.service"

@ApiTags("Face Tracking Challenge")
@Controller("face-tracking-challenge")
export class FaceTrackingChallengeController {
  constructor(private readonly faceTrackingChallengeService: FaceTrackingChallengeService) {}

  @Post("create")
  @ApiOperation({ summary: "Create a new face tracking session" })
  @ApiResponse({ status: 201, description: "Session created successfully" })
  async createSession(
    @Body() body: {
      userId: string
      settings?: Partial<FaceTrackingSettings>
    },
  ) {
    try {
      const { userId, settings } = body
      return this.faceTrackingChallengeService.createSession(userId, settings)
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Post(":sessionId/start")
  @ApiOperation({ summary: "Start a face tracking session" })
  @ApiResponse({ status: 200, description: "Session started successfully" })
  async startSession(@Param("sessionId") sessionId: string) {
    try {
      const result = this.faceTrackingChallengeService.startSession(sessionId)
      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.BAD_REQUEST)
      }
      return result
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Post(":sessionId/detection")
  @ApiOperation({ summary: "Process face detection data" })
  @ApiResponse({ status: 200, description: "Face detection processed" })
  async processFaceDetection(
    @Param("sessionId") sessionId: string,
    @Body()
    body: {
      detections: Array<{
        confidence: number
        position: FacePosition
        landmarks?: FaceLandmarks
      }>
      timestamp?: number
    },
  ) {
    try {
      const { detections } = body
      return this.faceTrackingChallengeService.processFaceDetection(sessionId, detections)
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Post(":sessionId/end")
  @ApiOperation({ summary: "End a face tracking session manually" })
  @ApiResponse({ status: 200, description: "Session ended" })
  async endSession(@Param("sessionId") sessionId: string) {
    try {
      return this.faceTrackingChallengeService.endSession(sessionId)
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @Get(":sessionId/status")
  @ApiOperation({ summary: "Get the current status of a face tracking session" })
  @ApiResponse({ status: 200, description: "Session status" })
  async getSessionStatus(@Param("sessionId") sessionId: string) {
    const session = this.faceTrackingChallengeService.getSessionStatus(sessionId)

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
      sessions: this.faceTrackingChallengeService.getUserCompletedSessions(userId),
    }
  }

  @Get("user/:userId/statistics")
  @ApiOperation({ summary: "Get face tracking statistics for a user" })
  @ApiResponse({ status: 200, description: "User statistics" })
  async getUserStatistics(@Param("userId") userId: string) {
    return {
      userId,
      statistics: this.faceTrackingChallengeService.getUserStatistics(userId),
      timestamp: new Date().toISOString(),
    }
  }

  @Get("health")
  @ApiOperation({ summary: "Health check for face tracking challenge service" })
  healthCheck() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "face-tracking-challenge",
    }
  }
}
