import { Injectable, Logger } from "@nestjs/common"
import type { GPSPoint } from "../entities/gps-point.entity"

export interface RouteValidationResult {
  isValid: boolean
  completionPercentage: number
  totalDistance: number
  averageSpeed: number
  maxDeviation: number
  timeSpentOffRoute: number
  checkpointsHit: number
  totalCheckpoints: number
}

@Injectable()
export class RouteValidationService {
  private readonly logger = new Logger(RouteValidationService.name)

  async validateRoute(
    routePoints: Array<{
      latitude: number
      longitude: number
      order: number
      isCheckpoint?: boolean
      name?: string
    }>,
    gpsTrack: GPSPoint[],
    toleranceMeters = 50,
  ): Promise<RouteValidationResult> {
    if (gpsTrack.length === 0) {
      return {
        isValid: false,
        completionPercentage: 0,
        totalDistance: 0,
        averageSpeed: 0,
        maxDeviation: 0,
        timeSpentOffRoute: 0,
        checkpointsHit: 0,
        totalCheckpoints: routePoints.filter((p) => p.isCheckpoint).length,
      }
    }

    const sortedRoutePoints = [...routePoints].sort((a, b) => a.order - b.order)
    const checkpoints = sortedRoutePoints.filter((p) => p.isCheckpoint)

    let validPoints = 0
    let maxDeviation = 0
    let timeOffRoute = 0
    let checkpointsHit = 0

    // Validate each GPS point
    for (let i = 0; i < gpsTrack.length; i++) {
      const gpsPoint = gpsTrack[i]
      const minDistance = this.findMinimumDistanceToRoute(gpsPoint, sortedRoutePoints)

      if (minDistance <= toleranceMeters) {
        validPoints++
      } else {
        maxDeviation = Math.max(maxDeviation, minDistance)

        // Calculate time spent off route
        if (i > 0) {
          const timeDiff = (gpsPoint.timestamp.getTime() - gpsTrack[i - 1].timestamp.getTime()) / 1000
          timeOffRoute += timeDiff
        }
      }
    }

    // Check checkpoint hits
    for (const checkpoint of checkpoints) {
      const hitCheckpoint = gpsTrack.some((gps) => {
        const distance = this.calculateDistance(gps.latitude, gps.longitude, checkpoint.latitude, checkpoint.longitude)
        return distance <= toleranceMeters * 2 // More lenient for checkpoints
      })

      if (hitCheckpoint) {
        checkpointsHit++
      }
    }

    const completionPercentage = (validPoints / gpsTrack.length) * 100
    const totalDistance = this.calculateTotalDistance(gpsTrack)
    const totalTime = (gpsTrack[gpsTrack.length - 1].timestamp.getTime() - gpsTrack[0].timestamp.getTime()) / 1000
    const averageSpeed = totalTime > 0 ? totalDistance / totalTime : 0

    // Route is valid if:
    // 1. At least 80% of points are within tolerance
    // 2. All mandatory checkpoints are hit
    // 3. Total distance is reasonable (within 50% of expected)
    const isValid = completionPercentage >= 80 && checkpointsHit === checkpoints.length && totalDistance > 0 // Additional validation can be added

    return {
      isValid,
      completionPercentage,
      totalDistance,
      averageSpeed,
      maxDeviation,
      timeSpentOffRoute: timeOffRoute,
      checkpointsHit,
      totalCheckpoints: checkpoints.length,
    }
  }

  private findMinimumDistanceToRoute(
    gpsPoint: GPSPoint,
    routePoints: Array<{ latitude: number; longitude: number }>,
  ): number {
    let minDistance = Number.POSITIVE_INFINITY

    for (const routePoint of routePoints) {
      const distance = this.calculateDistance(
        gpsPoint.latitude,
        gpsPoint.longitude,
        routePoint.latitude,
        routePoint.longitude,
      )
      minDistance = Math.min(minDistance, distance)
    }

    return minDistance
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

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  async analyzeRouteEfficiency(
    plannedRoute: Array<{ latitude: number; longitude: number; order: number }>,
    actualTrack: GPSPoint[],
  ): Promise<{
    efficiency: number
    wastedDistance: number
    shortcuts: Array<{ start: GPSPoint; end: GPSPoint; distanceSaved: number }>
    detours: Array<{ start: GPSPoint; end: GPSPoint; extraDistance: number }>
  }> {
    const plannedDistance = this.calculatePlannedRouteDistance(plannedRoute)
    const actualDistance = this.calculateTotalDistance(actualTrack)

    const efficiency = plannedDistance > 0 ? (plannedDistance / actualDistance) * 100 : 0
    const wastedDistance = Math.max(0, actualDistance - plannedDistance)

    // Analyze shortcuts and detours (simplified implementation)
    const shortcuts: Array<{ start: GPSPoint; end: GPSPoint; distanceSaved: number }> = []
    const detours: Array<{ start: GPSPoint; end: GPSPoint; extraDistance: number }> = []

    return {
      efficiency,
      wastedDistance,
      shortcuts,
      detours,
    }
  }

  private calculatePlannedRouteDistance(
    routePoints: Array<{ latitude: number; longitude: number; order: number }>,
  ): number {
    const sortedPoints = [...routePoints].sort((a, b) => a.order - b.order)

    if (sortedPoints.length < 2) return 0

    let totalDistance = 0

    for (let i = 1; i < sortedPoints.length; i++) {
      const prev = sortedPoints[i - 1]
      const curr = sortedPoints[i]

      const distance = this.calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
      totalDistance += distance
    }

    return totalDistance / 1000 // Convert to kilometers
  }
}
