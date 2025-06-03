import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { GPSPoint } from "../entities/gps-point.entity"
import type { GPSUpdateDto } from "../dto/gps-update.dto"
import type { StepChallengeService } from "./step-challenge.service"

@Injectable()
export class GPSTrackingService {
  private readonly logger = new Logger(GPSTrackingService.name)

  constructor(
    private readonly gpsPointRepository: Repository<GPSPoint>,
    private readonly challengeService: StepChallengeService,
  ) {}

  async recordGPSPoint(gpsUpdateDto: GPSUpdateDto): Promise<GPSPoint> {
    const gpsPoint = this.gpsPointRepository.create({
      attemptId: gpsUpdateDto.attemptId,
      latitude: gpsUpdateDto.latitude,
      longitude: gpsUpdateDto.longitude,
      altitude: gpsUpdateDto.altitude,
      accuracy: gpsUpdateDto.accuracy,
      speed: gpsUpdateDto.speed,
      bearing: gpsUpdateDto.bearing,
      timestamp: gpsUpdateDto.timestamp ? new Date(gpsUpdateDto.timestamp) : new Date(),
    })

    const savedPoint = await this.gpsPointRepository.save(gpsPoint)

    // Update route progress
    await this.updateRouteProgress(gpsUpdateDto.attemptId)

    return savedPoint
  }

  async getGPSTrack(attemptId: string): Promise<GPSPoint[]> {
    return this.gpsPointRepository.find({
      where: { attemptId },
      order: { timestamp: "ASC" },
    })
  }

  private async updateRouteProgress(attemptId: string): Promise<void> {
    try {
      const attempt = await this.challengeService.getAttemptById(attemptId)
      const gpsPoints = await this.getGPSTrack(attemptId)

      if (gpsPoints.length === 0) return

      const routeProgress = this.calculateRouteProgress(attempt.challenge.routePoints, gpsPoints)
      const distance = this.calculateTotalDistance(gpsPoints)

      await this.challengeService.updateAttemptProgress(attemptId, {
        routeProgress,
        currentDistanceKm: distance,
      })
    } catch (error) {
      this.logger.error(`Failed to update route progress for attempt ${attemptId}`, error)
    }
  }

  private calculateRouteProgress(
    routePoints: Array<{ latitude: number; longitude: number; order: number }>,
    gpsPoints: GPSPoint[],
  ): number {
    if (routePoints.length === 0 || gpsPoints.length === 0) return 0

    const sortedRoutePoints = [...routePoints].sort((a, b) => a.order - b.order)
    const latestGPS = gpsPoints[gpsPoints.length - 1]

    let maxProgress = 0

    for (let i = 0; i < sortedRoutePoints.length; i++) {
      const routePoint = sortedRoutePoints[i]
      const distance = this.calculateDistance(
        latestGPS.latitude,
        latestGPS.longitude,
        routePoint.latitude,
        routePoint.longitude,
      )

      // If within tolerance of this route point, calculate progress
      if (distance <= 100) {
        // 100 meters tolerance
        const progress = ((i + 1) / sortedRoutePoints.length) * 100
        maxProgress = Math.max(maxProgress, progress)
      }
    }

    return Math.min(100, maxProgress)
  }

  private calculateTotalDistance(gpsPoints: GPSPoint[]): number {
    if (gpsPoints.length < 2) return 0

    let totalDistance = 0

    for (let i = 1; i < gpsPoints.length; i++) {
      const prev = gpsPoints[i - 1]
      const curr = gpsPoints[i]

      const distance = this.calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
      totalDistance += distance
    }

    return totalDistance / 1000 // Convert to kilometers
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000 // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  async validateRouteCompletion(attemptId: string): Promise<{
    isValid: boolean
    completionPercentage: number
    deviations: Array<{ point: GPSPoint; distanceFromRoute: number }>
  }> {
    const attempt = await this.challengeService.getAttemptById(attemptId)
    const gpsPoints = await this.getGPSTrack(attemptId)

    if (gpsPoints.length === 0) {
      return {
        isValid: false,
        completionPercentage: 0,
        deviations: [],
      }
    }

    const routePoints = attempt.challenge.routePoints
    const tolerance = attempt.challenge.routeToleranceMeters

    const deviations: Array<{ point: GPSPoint; distanceFromRoute: number }> = []
    let validPoints = 0

    for (const gpsPoint of gpsPoints) {
      let minDistance = Number.POSITIVE_INFINITY

      // Find minimum distance to any route point
      for (const routePoint of routePoints) {
        const distance = this.calculateDistance(
          gpsPoint.latitude,
          gpsPoint.longitude,
          routePoint.latitude,
          routePoint.longitude,
        )
        minDistance = Math.min(minDistance, distance)
      }

      if (minDistance <= tolerance) {
        validPoints++
      } else {
        deviations.push({
          point: gpsPoint,
          distanceFromRoute: minDistance,
        })
      }
    }

    const completionPercentage = (validPoints / gpsPoints.length) * 100
    const isValid = completionPercentage >= 80 // 80% of points must be within tolerance

    return {
      isValid,
      completionPercentage,
      deviations,
    }
  }
}
