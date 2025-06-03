import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type StepChallenge, ChallengeStatus } from "../entities/step-challenge.entity"
import { type ChallengeAttempt, AttemptStatus } from "../entities/challenge-attempt.entity"
import type { CreateChallengeDto } from "../dto/create-challenge.dto"
import type { StartChallengeDto } from "../dto/start-challenge.dto"

@Injectable()
export class StepChallengeService {
  private readonly logger = new Logger(StepChallengeService.name)

  constructor(
    private readonly challengeRepository: Repository<StepChallenge>,
    private readonly attemptRepository: Repository<ChallengeAttempt>,
  ) {}

  async createChallenge(createChallengeDto: CreateChallengeDto): Promise<StepChallenge> {
    // Calculate route bounds
    const routeBounds = this.calculateRouteBounds(createChallengeDto.routePoints)

    const challenge = this.challengeRepository.create({
      ...createChallengeDto,
      routeBounds,
    })

    return this.challengeRepository.save(challenge)
  }

  async getActiveChallenges(): Promise<StepChallenge[]> {
    return this.challengeRepository.find({
      where: { status: ChallengeStatus.ACTIVE },
      order: { createdAt: "DESC" },
    })
  }

  async getChallengeById(id: string): Promise<StepChallenge> {
    const challenge = await this.challengeRepository.findOne({
      where: { id },
    })

    if (!challenge) {
      throw new NotFoundException("Challenge not found")
    }

    return challenge
  }

  async startChallenge(startChallengeDto: StartChallengeDto): Promise<ChallengeAttempt> {
    const challenge = await this.getChallengeById(startChallengeDto.challengeId)

    if (challenge.status !== ChallengeStatus.ACTIVE) {
      throw new Error("Challenge is not active")
    }

    // Check if user has an active attempt for this challenge
    const existingAttempt = await this.attemptRepository.findOne({
      where: {
        userId: startChallengeDto.userId,
        challengeId: startChallengeDto.challengeId,
        status: AttemptStatus.IN_PROGRESS,
      },
    })

    if (existingAttempt) {
      throw new Error("User already has an active attempt for this challenge")
    }

    const attempt = this.attemptRepository.create({
      userId: startChallengeDto.userId,
      challengeId: startChallengeDto.challengeId,
      startedAt: new Date(),
      status: AttemptStatus.IN_PROGRESS,
    })

    const savedAttempt = await this.attemptRepository.save(attempt)

    this.logger.log(`Challenge attempt started: ${savedAttempt.id} for user ${startChallengeDto.userId}`)

    return savedAttempt
  }

  async getAttemptById(id: string): Promise<ChallengeAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id },
      relations: ["challenge", "gpsPoints", "stepData"],
    })

    if (!attempt) {
      throw new NotFoundException("Challenge attempt not found")
    }

    return attempt
  }

  async getUserAttempts(userId: string): Promise<ChallengeAttempt[]> {
    return this.attemptRepository.find({
      where: { userId },
      relations: ["challenge"],
      order: { createdAt: "DESC" },
    })
  }

  async getActiveAttempt(userId: string, challengeId: string): Promise<ChallengeAttempt | null> {
    return this.attemptRepository.findOne({
      where: {
        userId,
        challengeId,
        status: AttemptStatus.IN_PROGRESS,
      },
      relations: ["challenge"],
    })
  }

  async updateAttemptProgress(
    attemptId: string,
    progress: {
      currentSteps?: number
      currentDistanceKm?: number
      routeProgress?: number
    },
  ): Promise<ChallengeAttempt> {
    const attempt = await this.getAttemptById(attemptId)

    if (progress.currentSteps !== undefined) {
      attempt.currentSteps = progress.currentSteps
      attempt.stepGoalMet = progress.currentSteps >= attempt.challenge.stepGoal
    }

    if (progress.currentDistanceKm !== undefined) {
      attempt.currentDistanceKm = progress.currentDistanceKm
    }

    if (progress.routeProgress !== undefined) {
      attempt.routeProgress = progress.routeProgress
      attempt.routeCompleted = progress.routeProgress >= 100
    }

    return this.attemptRepository.save(attempt)
  }

  async completeAttempt(attemptId: string, completionData?: Record<string, any>): Promise<ChallengeAttempt> {
    const attempt = await this.getAttemptById(attemptId)

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new Error("Attempt is not in progress")
    }

    const isSuccessful = attempt.stepGoalMet && attempt.routeCompleted

    attempt.status = isSuccessful ? AttemptStatus.COMPLETED : AttemptStatus.FAILED
    attempt.completedAt = new Date()
    attempt.completionData = completionData

    const savedAttempt = await this.attemptRepository.save(attempt)

    this.logger.log(
      `Challenge attempt ${isSuccessful ? "completed" : "failed"}: ${attemptId} for user ${attempt.userId}`,
    )

    return savedAttempt
  }

  async abandonAttempt(attemptId: string): Promise<ChallengeAttempt> {
    const attempt = await this.getAttemptById(attemptId)

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new Error("Attempt is not in progress")
    }

    attempt.status = AttemptStatus.ABANDONED
    attempt.completedAt = new Date()

    return this.attemptRepository.save(attempt)
  }

  private calculateRouteBounds(routePoints: Array<{ latitude: number; longitude: number }>): {
    north: number
    south: number
    east: number
    west: number
  } {
    if (routePoints.length === 0) {
      throw new Error("Route must have at least one point")
    }

    let north = routePoints[0].latitude
    let south = routePoints[0].latitude
    let east = routePoints[0].longitude
    let west = routePoints[0].longitude

    for (const point of routePoints) {
      north = Math.max(north, point.latitude)
      south = Math.min(south, point.latitude)
      east = Math.max(east, point.longitude)
      west = Math.min(west, point.longitude)
    }

    return { north, south, east, west }
  }

  async getChallengeStats(challengeId: string): Promise<{
    totalAttempts: number
    completedAttempts: number
    failedAttempts: number
    averageCompletionTime: number
    successRate: number
  }> {
    const attempts = await this.attemptRepository.find({
      where: { challengeId },
    })

    const totalAttempts = attempts.length
    const completedAttempts = attempts.filter((a) => a.status === AttemptStatus.COMPLETED).length
    const failedAttempts = attempts.filter((a) => a.status === AttemptStatus.FAILED).length

    const completedWithTime = attempts.filter(
      (a) => a.status === AttemptStatus.COMPLETED && a.startedAt && a.completedAt,
    )

    const averageCompletionTime =
      completedWithTime.length > 0
        ? completedWithTime.reduce((sum, a) => {
            const duration = a.completedAt!.getTime() - a.startedAt.getTime()
            return sum + duration
          }, 0) / completedWithTime.length
        : 0

    const successRate = totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0

    return {
      totalAttempts,
      completedAttempts,
      failedAttempts,
      averageCompletionTime: Math.round(averageCompletionTime / 1000), // seconds
      successRate: Math.round(successRate * 100) / 100,
    }
  }
}
