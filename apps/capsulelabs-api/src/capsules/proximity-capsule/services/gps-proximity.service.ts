import { Injectable, Logger } from "@nestjs/common"
import type {
  GpsData,
  GpsConfig,
  ProximityGroup,
  ProximityValidationResult,
} from "../entities/proximity-capsule.entity"
import { ProximityMethod, ProximityReliability } from "../entities/proximity-capsule.entity"

@Injectable()
export class GpsProximityService {
  private readonly logger = new Logger(GpsProximityService.name)

  async validateGpsProximity(
    gpsData: GpsData,
    config: GpsConfig,
    group: ProximityGroup,
  ): Promise<ProximityValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate GPS accuracy
    if (gpsData.accuracy > config.accuracyThreshold) {
      if (config.requireHighAccuracy) {
        errors.push(`GPS accuracy too low: ${gpsData.accuracy}m (threshold: ${config.accuracyThreshold}m)`)
      } else {
        warnings.push(`GPS accuracy is lower than preferred: ${gpsData.accuracy}m`)
      }
    }

    // Check timestamp freshness
    const dataAge = Date.now() - new Date(gpsData.timestamp).getTime()
    if (dataAge > 60000) {
      // Older than 1 minute
      warnings.push(`GPS data is ${Math.round(dataAge / 1000)} seconds old`)
    }

    // Find other group members' GPS data and calculate distances
    const groupGpsData = this.getGroupGpsData(group)
    const distances = groupGpsData.map((otherGps) => this.calculateDistance(gpsData, otherGps))

    let estimatedDistance: number | undefined
    if (distances.length > 0) {
      estimatedDistance = Math.min(...distances) // Distance to closest group member

      // Check if within distance threshold
      if (estimatedDistance > config.maxDistanceMeters) {
        errors.push(
          `Distance to nearest group member (${estimatedDistance.toFixed(1)}m) exceeds threshold (${config.maxDistanceMeters}m)`,
        )
      }
    }

    // Calculate confidence
    const confidence = this.calculateGpsConfidence(gpsData, config, distances)

    const isValid = errors.length === 0 && confidence >= 75 // High threshold for GPS

    return {
      isValid,
      confidence: Math.round(confidence * 100) / 100,
      detectedMethods: [ProximityMethod.GPS_LOCATION],
      estimatedDistance,
      reliability: this.calculateGpsReliability(gpsData, confidence, distances.length),
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  calculateDistance(gps1: GpsData, gps2: GpsData): number {
    const R = 6371000 // Earth's radius in meters
    const lat1Rad = this.toRadians(gps1.latitude)
    const lat2Rad = this.toRadians(gps2.latitude)
    const deltaLatRad = this.toRadians(gps2.latitude - gps1.latitude)
    const deltaLonRad = this.toRadians(gps2.longitude - gps1.longitude)

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  private getGroupGpsData(group: ProximityGroup): GpsData[] {
    return group.members
      .map((member) => member.proximityData.gps)
      .filter((gpsData): gpsData is GpsData => gpsData !== undefined)
  }

  private calculateGpsConfidence(gpsData: GpsData, config: GpsConfig, distances: number[]): number {
    let confidence = 70 // Base confidence for GPS

    // Accuracy factor
    const accuracyRatio = Math.max(0, 1 - gpsData.accuracy / config.accuracyThreshold)
    confidence += accuracyRatio * 20

    // Distance factor
    if (distances.length > 0) {
      const minDistance = Math.min(...distances)
      if (minDistance <= config.maxDistanceMeters * 0.5) {
        // Very close
        confidence += 15
      } else if (minDistance <= config.maxDistanceMeters * 0.8) {
        // Moderately close
        confidence += 10
      }
    }

    // Data freshness factor
    const dataAge = Date.now() - new Date(gpsData.timestamp).getTime()
    if (dataAge < 30000) {
      // Less than 30 seconds old
      confidence += 10
    } else if (dataAge > 120000) {
      // More than 2 minutes old
      confidence -= 15
    }

    // Altitude data bonus (indicates more precise GPS)
    if (gpsData.altitude !== undefined) {
      confidence += 5
    }

    return Math.max(0, Math.min(100, confidence))
  }

  private calculateGpsReliability(
    gpsData: GpsData,
    confidence: number,
    groupMembersCount: number,
  ): ProximityReliability {
    let reliabilityScore = confidence * 0.8

    // Bonus for high accuracy
    if (gpsData.accuracy <= 5) reliabilityScore += 20
    else if (gpsData.accuracy <= 10) reliabilityScore += 15
    else if (gpsData.accuracy <= 20) reliabilityScore += 10

    // Bonus for multiple group members with GPS
    reliabilityScore += Math.min(groupMembersCount * 5, 15)

    // Bonus for fresh data
    const dataAge = Date.now() - new Date(gpsData.timestamp).getTime()
    if (dataAge < 30000) reliabilityScore += 10

    // Bonus for altitude data
    if (gpsData.altitude !== undefined) reliabilityScore += 5

    if (reliabilityScore >= 90) return ProximityReliability.VERY_HIGH
    if (reliabilityScore >= 75) return ProximityReliability.HIGH
    if (reliabilityScore >= 55) return ProximityReliability.MEDIUM
    return ProximityReliability.LOW
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}
