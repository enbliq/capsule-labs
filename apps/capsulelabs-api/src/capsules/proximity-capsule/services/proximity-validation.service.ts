import { Injectable, Logger } from "@nestjs/common"
import type {
  ProximityValidationResult,
  ProximityConfig,
  ProximityData,
  ProximityGroup,
} from "../entities/proximity-capsule.entity"
import { ProximityMethod, ProximityReliability } from "../entities/proximity-capsule.entity"
import type { BluetoothProximityService } from "./bluetooth-proximity.service"
import type { NetworkProximityService } from "./network-proximity.service"
import type { GpsProximityService } from "./gps-proximity.service"

@Injectable()
export class ProximityValidationService {
  private readonly logger = new Logger(ProximityValidationService.name)

  constructor(
    private readonly bluetoothProximity: BluetoothProximityService,
    private readonly networkProximity: NetworkProximityService,
    private readonly gpsProximity: GpsProximityService,
  ) {}

  async validateProximity(
    proximityData: ProximityData,
    config: ProximityConfig,
    group: ProximityGroup,
  ): Promise<ProximityValidationResult> {
    const validationResults: ProximityValidationResult[] = []
    const detectedMethods: ProximityMethod[] = []
    const errors: string[] = []
    const warnings: string[] = []

    // Validate each enabled detection method
    for (const method of config.detectionMethods) {
      try {
        let result: ProximityValidationResult

        switch (method) {
          case ProximityMethod.BLUETOOTH:
            if (proximityData.bluetooth && config.bluetoothConfig?.enabled) {
              result = await this.bluetoothProximity.validateBluetoothProximity(
                proximityData.bluetooth,
                config.bluetoothConfig,
                group,
              )
              validationResults.push(result)
              if (result.isValid) detectedMethods.push(method)
            } else {
              errors.push("Bluetooth data missing or Bluetooth not configured")
            }
            break

          case ProximityMethod.WIFI_NETWORK:
            if (proximityData.network && config.networkConfig?.enabled) {
              result = await this.networkProximity.validateNetworkProximity(
                proximityData.network,
                config.networkConfig,
                group,
              )
              validationResults.push(result)
              if (result.isValid) detectedMethods.push(method)
            } else {
              errors.push("Network data missing or Network not configured")
            }
            break

          case ProximityMethod.GPS_LOCATION:
            if (proximityData.gps && config.gpsConfig?.enabled) {
              result = await this.gpsProximity.validateGpsProximity(proximityData.gps, config.gpsConfig, group)
              validationResults.push(result)
              if (result.isValid) detectedMethods.push(method)
            } else {
              errors.push("GPS data missing or GPS not configured")
            }
            break

          default:
            warnings.push(`Unknown proximity method: ${method}`)
        }
      } catch (error) {
        this.logger.error(`Error validating proximity method ${method}:`, error)
        errors.push(`Failed to validate ${method}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    // Combine results
    const combinedResult = this.combineValidationResults(validationResults, config, detectedMethods)

    return {
      isValid: combinedResult.isValid,
      confidence: combinedResult.confidence,
      detectedMethods,
      estimatedDistance: combinedResult.estimatedDistance,
      reliability: combinedResult.reliability,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  private combineValidationResults(
    results: ProximityValidationResult[],
    config: ProximityConfig,
    detectedMethods: ProximityMethod[],
  ): ProximityValidationResult {
    if (results.length === 0) {
      return {
        isValid: false,
        confidence: 0,
        detectedMethods: [],
        reliability: ProximityReliability.LOW,
        errors: ["No validation results available"],
      }
    }

    // Calculate combined confidence
    const validResults = results.filter((r) => r.isValid)
    const totalConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0)
    const averageConfidence = validResults.length > 0 ? totalConfidence / validResults.length : 0

    // Weight confidence based on number of detection methods
    const methodWeight = Math.min(detectedMethods.length / config.detectionMethods.length, 1)
    const weightedConfidence = averageConfidence * methodWeight

    // Determine if validation passes
    const isValid = weightedConfidence >= config.confidenceLevel && validResults.length > 0

    // Calculate estimated distance (use most reliable method)
    let estimatedDistance: number | undefined
    const distanceResults = validResults.filter((r) => r.estimatedDistance !== undefined)
    if (distanceResults.length > 0) {
      // Use GPS if available (most accurate), otherwise use average
      const gpsResult = distanceResults.find((r) => r.detectedMethods?.includes(ProximityMethod.GPS_LOCATION))
      if (gpsResult) {
        estimatedDistance = gpsResult.estimatedDistance
      } else {
        estimatedDistance =
          distanceResults.reduce((sum, r) => sum + (r.estimatedDistance || 0), 0) / distanceResults.length
      }
    }

    // Determine reliability
    const reliability = this.calculateReliability(detectedMethods, validResults, weightedConfidence)

    return {
      isValid,
      confidence: Math.round(weightedConfidence * 100) / 100,
      detectedMethods,
      estimatedDistance,
      reliability,
    }
  }

  private calculateReliability(
    detectedMethods: ProximityMethod[],
    validResults: ProximityValidationResult[],
    confidence: number,
  ): ProximityReliability {
    let reliabilityScore = 0

    // Base score from confidence
    reliabilityScore += confidence * 0.4

    // Bonus for multiple detection methods
    reliabilityScore += Math.min(detectedMethods.length * 15, 30)

    // Bonus for specific high-reliability methods
    if (detectedMethods.includes(ProximityMethod.GPS_LOCATION)) reliabilityScore += 20
    if (detectedMethods.includes(ProximityMethod.BLUETOOTH)) reliabilityScore += 15
    if (detectedMethods.includes(ProximityMethod.WIFI_NETWORK)) reliabilityScore += 10

    // Penalty for low individual method confidence
    const lowConfidenceResults = validResults.filter((r) => r.confidence < 70)
    reliabilityScore -= lowConfidenceResults.length * 5

    // Determine reliability level
    if (reliabilityScore >= 85) return ProximityReliability.VERY_HIGH
    if (reliabilityScore >= 70) return ProximityReliability.HIGH
    if (reliabilityScore >= 50) return ProximityReliability.MEDIUM
    return ProximityReliability.LOW
  }

  async validateGroupProximity(group: ProximityGroup, config: ProximityConfig): Promise<boolean> {
    if (group.members.length < 2) return true // Single member doesn't need proximity validation

    // Check proximity between all pairs of members
    for (let i = 0; i < group.members.length; i++) {
      for (let j = i + 1; j < group.members.length; j++) {
        const member1 = group.members[i]
        const member2 = group.members[j]

        const proximityValid = await this.validateMemberPairProximity(
          member1.proximityData,
          member2.proximityData,
          config,
        )

        if (!proximityValid) {
          this.logger.warn(`Proximity validation failed between ${member1.userId} and ${member2.userId}`)
          return false
        }
      }
    }

    return true
  }

  private async validateMemberPairProximity(
    data1: ProximityData,
    data2: ProximityData,
    config: ProximityConfig,
  ): Promise<boolean> {
    // Check GPS proximity if both have GPS data
    if (data1.gps && data2.gps && config.gpsConfig?.enabled) {
      const distance = this.gpsProximity.calculateDistance(data1.gps, data2.gps)
      if (distance > (config.distanceThreshold || config.gpsConfig.maxDistanceMeters)) {
        return false
      }
    }

    // Check Bluetooth proximity if both have Bluetooth data
    if (data1.bluetooth && data2.bluetooth && config.bluetoothConfig?.enabled) {
      const bluetoothProximity = this.bluetoothProximity.checkBluetoothPairProximity(
        data1.bluetooth,
        data2.bluetooth,
        config.bluetoothConfig,
      )
      if (!bluetoothProximity) {
        return false
      }
    }

    // Check network proximity if both have network data
    if (data1.network && data2.network && config.networkConfig?.enabled) {
      const networkProximity = this.networkProximity.checkNetworkPairProximity(
        data1.network,
        data2.network,
        config.networkConfig,
      )
      if (!networkProximity) {
        return false
      }
    }

    return true
  }
}
