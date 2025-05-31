import { Injectable, Logger } from "@nestjs/common"
import type {
  NetworkData,
  NetworkConfig,
  ProximityGroup,
  ProximityValidationResult,
} from "../entities/proximity-capsule.entity"
import { ProximityMethod, ProximityReliability } from "../entities/proximity-capsule.entity"

@Injectable()
export class NetworkProximityService {
  private readonly logger = new Logger(NetworkProximityService.name)

  async validateNetworkProximity(
    networkData: NetworkData,
    config: NetworkConfig,
    group: ProximityGroup,
  ): Promise<ProximityValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Check hotspot restriction
    if (networkData.isHotspot && !config.allowHotspot) {
      errors.push("Hotspot connections are not allowed for this capsule")
    }

    // Find other group members' network data
    const groupNetworkData = this.getGroupNetworkData(group)

    // Validate same WiFi network if required
    if (config.requireSameWifi) {
      const sameWifiValidation = this.validateSameWifi(networkData, groupNetworkData)
      if (!sameWifiValidation.isValid) {
        errors.push(...sameWifiValidation.errors)
      }
    }

    // Validate same subnet if required
    if (config.requireSameSubnet) {
      const sameSubnetValidation = this.validateSameSubnet(networkData, groupNetworkData)
      if (!sameSubnetValidation.isValid) {
        errors.push(...sameSubnetValidation.errors)
      }
    }

    // Check network latency if available
    if (networkData.networkLatency !== undefined) {
      if (networkData.networkLatency > 100) {
        warnings.push(`High network latency detected: ${networkData.networkLatency}ms`)
      }
    }

    // Calculate confidence
    const confidence = this.calculateNetworkConfidence(networkData, config, groupNetworkData)

    const isValid = errors.length === 0 && confidence >= 70 // Higher threshold for network proximity

    return {
      isValid,
      confidence: Math.round(confidence * 100) / 100,
      detectedMethods: [ProximityMethod.WIFI_NETWORK],
      reliability: this.calculateNetworkReliability(networkData, confidence, groupNetworkData.length),
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  checkNetworkPairProximity(data1: NetworkData, data2: NetworkData, config: NetworkConfig): boolean {
    // Check hotspot restrictions
    if ((data1.isHotspot || data2.isHotspot) && !config.allowHotspot) {
      return false
    }

    // Check same WiFi if required
    if (config.requireSameWifi) {
      if (data1.wifiSSID !== data2.wifiSSID || data1.wifiBSSID !== data2.wifiBSSID) {
        return false
      }
    }

    // Check same subnet if required
    if (config.requireSameSubnet) {
      if (data1.subnet !== data2.subnet) {
        return false
      }
    }

    return true
  }

  private getGroupNetworkData(group: ProximityGroup): NetworkData[] {
    return group.members
      .map((member) => member.proximityData.network)
      .filter((networkData): networkData is NetworkData => networkData !== undefined)
  }

  private validateSameWifi(
    networkData: NetworkData,
    groupNetworkData: NetworkData[],
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!networkData.wifiSSID) {
      errors.push("WiFi SSID is required for same WiFi validation")
      return { isValid: false, errors }
    }

    // Check if any group member is on the same WiFi
    const sameWifiMembers = groupNetworkData.filter(
      (data) => data.wifiSSID === networkData.wifiSSID && data.wifiBSSID === networkData.wifiBSSID,
    )

    if (groupNetworkData.length > 0 && sameWifiMembers.length === 0) {
      errors.push(`Not connected to the same WiFi network as other group members`)
    }

    return { isValid: errors.length === 0, errors }
  }

  private validateSameSubnet(
    networkData: NetworkData,
    groupNetworkData: NetworkData[],
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check if any group member is on the same subnet
    const sameSubnetMembers = groupNetworkData.filter((data) => data.subnet === networkData.subnet)

    if (groupNetworkData.length > 0 && sameSubnetMembers.length === 0) {
      errors.push(`Not connected to the same subnet as other group members`)
    }

    return { isValid: errors.length === 0, errors }
  }

  private calculateNetworkConfidence(
    networkData: NetworkData,
    config: NetworkConfig,
    groupNetworkData: NetworkData[],
  ): number {
    let confidence = 60 // Base confidence for network proximity

    // Same WiFi network bonus
    if (config.requireSameWifi && networkData.wifiSSID) {
      const sameWifiMembers = groupNetworkData.filter(
        (data) => data.wifiSSID === networkData.wifiSSID && data.wifiBSSID === networkData.wifiBSSID,
      )
      if (sameWifiMembers.length > 0) {
        confidence += 25
      }
    }

    // Same subnet bonus
    if (config.requireSameSubnet) {
      const sameSubnetMembers = groupNetworkData.filter((data) => data.subnet === networkData.subnet)
      if (sameSubnetMembers.length > 0) {
        confidence += 20
      }
    }

    // Low latency bonus
    if (networkData.networkLatency !== undefined) {
      if (networkData.networkLatency < 10) {
        confidence += 15
      } else if (networkData.networkLatency < 50) {
        confidence += 10
      } else if (networkData.networkLatency > 200) {
        confidence -= 15
      }
    }

    // Hotspot penalty
    if (networkData.isHotspot) {
      confidence -= 10
    }

    // Private network bonus (common private IP ranges)
    if (this.isPrivateIP(networkData.ipAddress)) {
      confidence += 10
    }

    return Math.max(0, Math.min(100, confidence))
  }

  private calculateNetworkReliability(
    networkData: NetworkData,
    confidence: number,
    groupMembersCount: number,
  ): ProximityReliability {
    let reliabilityScore = confidence * 0.7

    // Bonus for multiple group members on same network
    reliabilityScore += Math.min(groupMembersCount * 8, 20)

    // Bonus for specific network identifiers
    if (networkData.wifiSSID && networkData.wifiBSSID) reliabilityScore += 15
    if (networkData.networkLatency !== undefined && networkData.networkLatency < 50) reliabilityScore += 10

    // Penalty for hotspot
    if (networkData.isHotspot) reliabilityScore -= 15

    if (reliabilityScore >= 85) return ProximityReliability.VERY_HIGH
    if (reliabilityScore >= 70) return ProximityReliability.HIGH
    if (reliabilityScore >= 50) return ProximityReliability.MEDIUM
    return ProximityReliability.LOW
  }

  private isPrivateIP(ip: string): boolean {
    const privateRanges = [/^10\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^192\.168\./]
    return privateRanges.some((range) => range.test(ip))
  }
}
