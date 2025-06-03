import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { StepData } from "../entities/step-data.entity"
import type { StepUpdateDto } from "../dto/step-update.dto"
import type { StepChallengeService } from "./step-challenge.service"

@Injectable()
export class StepCountingService {
  private readonly logger = new Logger(StepCountingService.name)

  constructor(
    private readonly stepDataRepository: Repository<StepData>,
    private readonly challengeService: StepChallengeService,
  ) {}

  async recordStepData(stepUpdateDto: StepUpdateDto): Promise<StepData> {
    const stepData = this.stepDataRepository.create({
      attemptId: stepUpdateDto.attemptId,
      stepCount: stepUpdateDto.stepCount,
      cumulativeSteps: stepUpdateDto.cumulativeSteps,
      cadence: stepUpdateDto.cadence,
      strideLength: stepUpdateDto.strideLength,
      timestamp: stepUpdateDto.timestamp ? new Date(stepUpdateDto.timestamp) : new Date(),
      deviceData: stepUpdateDto.deviceData,
    })

    const savedStepData = await this.stepDataRepository.save(stepData)

    // Update step progress
    await this.updateStepProgress(stepUpdateDto.attemptId, stepUpdateDto.cumulativeSteps)

    return savedStepData
  }

  async getStepHistory(attemptId: string): Promise<StepData[]> {
    return this.stepDataRepository.find({
      where: { attemptId },
      order: { timestamp: "ASC" },
    })
  }

  private async updateStepProgress(attemptId: string, currentSteps: number): Promise<void> {
    try {
      await this.challengeService.updateAttemptProgress(attemptId, {
        currentSteps,
      })
    } catch (error) {
      this.logger.error(`Failed to update step progress for attempt ${attemptId}`, error)
    }
  }

  async validateStepGoal(attemptId: string): Promise<{
    isValid: boolean
    currentSteps: number
    goalSteps: number
    completionPercentage: number
    averageCadence: number
  }> {
    const attempt = await this.challengeService.getAttemptById(attemptId)
    const stepHistory = await this.getStepHistory(attemptId)

    if (stepHistory.length === 0) {
      return {
        isValid: false,
        currentSteps: 0,
        goalSteps: attempt.challenge.stepGoal,
        completionPercentage: 0,
        averageCadence: 0,
      }
    }

    const latestStepData = stepHistory[stepHistory.length - 1]
    const currentSteps = latestStepData.cumulativeSteps
    const goalSteps = attempt.challenge.stepGoal

    const completionPercentage = (currentSteps / goalSteps) * 100
    const isValid = currentSteps >= goalSteps

    // Calculate average cadence
    const cadenceValues = stepHistory.filter((s) => s.cadence !== null).map((s) => s.cadence!)
    const averageCadence =
      cadenceValues.length > 0 ? cadenceValues.reduce((a, b) => a + b, 0) / cadenceValues.length : 0

    return {
      isValid,
      currentSteps,
      goalSteps,
      completionPercentage: Math.min(100, completionPercentage),
      averageCadence,
    }
  }

  async detectAnomalies(attemptId: string): Promise<{
    hasAnomalies: boolean
    anomalies: Array<{
      type: "sudden_spike" | "impossible_cadence" | "inconsistent_data"
      timestamp: Date
      description: string
      severity: "low" | "medium" | "high"
    }>
  }> {
    const stepHistory = await this.getStepHistory(attemptId)

    if (stepHistory.length < 3) {
      return { hasAnomalies: false, anomalies: [] }
    }

    const anomalies: Array<{
      type: "sudden_spike" | "impossible_cadence" | "inconsistent_data"
      timestamp: Date
      description: string
      severity: "low" | "medium" | "high"
    }> = []

    // Check for sudden spikes in step count
    for (let i = 1; i < stepHistory.length; i++) {
      const prev = stepHistory[i - 1]
      const curr = stepHistory[i]

      const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000 // seconds
      const stepDiff = curr.cumulativeSteps - prev.cumulativeSteps

      if (timeDiff > 0) {
        const stepsPerSecond = stepDiff / timeDiff

        // Flag if more than 5 steps per second (unrealistic)
        if (stepsPerSecond > 5) {
          anomalies.push({
            type: "sudden_spike",
            timestamp: curr.timestamp,
            description: `Unrealistic step rate: ${stepsPerSecond.toFixed(2)} steps/second`,
            severity: "high",
          })
        }
      }

      // Check for impossible cadence
      if (curr.cadence && curr.cadence > 300) {
        // More than 300 steps per minute is unrealistic
        anomalies.push({
          type: "impossible_cadence",
          timestamp: curr.timestamp,
          description: `Impossible cadence: ${curr.cadence} steps/minute`,
          severity: "high",
        })
      }

      // Check for inconsistent data (steps going backwards)
      if (curr.cumulativeSteps < prev.cumulativeSteps) {
        anomalies.push({
          type: "inconsistent_data",
          timestamp: curr.timestamp,
          description: "Step count decreased",
          severity: "medium",
        })
      }
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
    }
  }

  async getStepStatistics(attemptId: string): Promise<{
    totalSteps: number
    averageCadence: number
    maxCadence: number
    averageStrideLength: number
    estimatedDistance: number
    duration: number
    efficiency: number
  }> {
    const stepHistory = await this.getStepHistory(attemptId)

    if (stepHistory.length === 0) {
      return {
        totalSteps: 0,
        averageCadence: 0,
        maxCadence: 0,
        averageStrideLength: 0,
        estimatedDistance: 0,
        duration: 0,
        efficiency: 0,
      }
    }

    const totalSteps = stepHistory[stepHistory.length - 1].cumulativeSteps
    const duration =
      (stepHistory[stepHistory.length - 1].timestamp.getTime() - stepHistory[0].timestamp.getTime()) / 1000

    const cadenceValues = stepHistory.filter((s) => s.cadence !== null).map((s) => s.cadence!)
    const averageCadence =
      cadenceValues.length > 0 ? cadenceValues.reduce((a, b) => a + b, 0) / cadenceValues.length : 0
    const maxCadence = cadenceValues.length > 0 ? Math.max(...cadenceValues) : 0

    const strideLengthValues = stepHistory.filter((s) => s.strideLength !== null).map((s) => s.strideLength!)
    const averageStrideLength =
      strideLengthValues.length > 0 ? strideLengthValues.reduce((a, b) => a + b, 0) / strideLengthValues.length : 0.7 // Default stride length

    const estimatedDistance = (totalSteps * averageStrideLength) / 1000 // km
    const efficiency = duration > 0 ? totalSteps / (duration / 60) : 0 // steps per minute

    return {
      totalSteps,
      averageCadence,
      maxCadence,
      averageStrideLength,
      estimatedDistance,
      duration,
      efficiency,
    }
  }
}
