import { Controller, Post, Get, Body, Param, Query, Put } from "@nestjs/common"
import type { StepChallengeService } from "../services/step-challenge.service"
import type { GPSTrackingService } from "../services/gps-tracking.service"
import type { StepCountingService } from "../services/step-counting.service"
import type { RouteValidationService } from "../services/route-validation.service"
import type { CreateChallengeDto } from "../dto/create-challenge.dto"
import type { StartChallengeDto } from "../dto/start-challenge.dto"
import type { GPSUpdateDto } from "../dto/gps-update.dto"
import type { StepUpdateDto } from "../dto/step-update.dto"

@Controller("step-challenges")
export class StepChallengeController {
  constructor(
    private readonly challengeService: StepChallengeService,
    private readonly gpsTrackingService: GPSTrackingService,
    private readonly stepCountingService: StepCountingService,
    private readonly routeValidationService: RouteValidationService,
  ) {}

  @Post()
  async createChallenge(@Body() createChallengeDto: CreateChallengeDto) {
    return this.challengeService.createChallenge(createChallengeDto);
  }

  @Get()
  async getActiveChallenges() {
    return this.challengeService.getActiveChallenges()
  }

  @Get(":id")
  async getChallengeById(@Param('id') id: string) {
    return this.challengeService.getChallengeById(id)
  }

  @Post("start")
  async startChallenge(@Body() startChallengeDto: StartChallengeDto) {
    return this.challengeService.startChallenge(startChallengeDto)
  }

  @Get("attempts/user/:userId")
  async getUserAttempts(@Param('userId') userId: string) {
    return this.challengeService.getUserAttempts(userId)
  }

  @Get("attempts/:id")
  async getAttemptById(@Param('id') id: string) {
    return this.challengeService.getAttemptById(id)
  }

  @Post("gps-update")
  async updateGPS(@Body() gpsUpdateDto: GPSUpdateDto) {
    return this.gpsTrackingService.recordGPSPoint(gpsUpdateDto)
  }

  @Post("step-update")
  async updateSteps(@Body() stepUpdateDto: StepUpdateDto) {
    return this.stepCountingService.recordStepData(stepUpdateDto)
  }

  @Get("attempts/:id/gps-track")
  async getGPSTrack(@Param('id') attemptId: string) {
    return this.gpsTrackingService.getGPSTrack(attemptId)
  }

  @Get("attempts/:id/step-history")
  async getStepHistory(@Param('id') attemptId: string) {
    return this.stepCountingService.getStepHistory(attemptId)
  }

  @Get("attempts/:id/validate-route")
  async validateRoute(@Param('id') attemptId: string) {
    return this.gpsTrackingService.validateRouteCompletion(attemptId)
  }

  @Get("attempts/:id/validate-steps")
  async validateSteps(@Param('id') attemptId: string) {
    return this.stepCountingService.validateStepGoal(attemptId)
  }

  @Get("attempts/:id/anomalies")
  async detectAnomalies(@Param('id') attemptId: string) {
    return this.stepCountingService.detectAnomalies(attemptId)
  }

  @Get("attempts/:id/statistics")
  async getAttemptStatistics(@Param('id') attemptId: string) {
    const stepStats = await this.stepCountingService.getStepStatistics(attemptId)
    const routeValidation = await this.gpsTrackingService.validateRouteCompletion(attemptId)
    
    return {
      steps: stepStats,
      route: routeValidation,
    }
  }

  @Put("attempts/:id/abandon")
  async abandonAttempt(@Param('id') attemptId: string) {
    return this.challengeService.abandonAttempt(attemptId)
  }

  @Get(":id/stats")
  async getChallengeStats(@Param('id') challengeId: string) {
    return this.challengeService.getChallengeStats(challengeId)
  }

  @Get("user/:userId/active")
  async getActiveAttempt(@Param('userId') userId: string, @Query('challengeId') challengeId: string) {
    return this.challengeService.getActiveAttempt(userId, challengeId)
  }
}
