import { Injectable, Logger } from "@nestjs/common"
import type {
  BluetoothData,
  BluetoothConfig,
  ProximityGroup,
  ProximityValidationResult,
} from "../entities/proximity-capsule.entity"
import { ProximityMethod, ProximityReliability } from "../entities/proximity-capsule.entity"

@Injectable()
export class BluetoothProximityService {
  private readonly logger = new Logger(BluetoothProximityService.name)

  async validateBluetoothProximity(
    bluetoothData: BluetoothData,
    config: BluetoothConfig,
    group: ProximityGroup,
  ): Promise<ProximityValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate RSSI threshold
    if (bluetoothData.rssi < config.rssiThreshold) {
      errors.push(`Bluetooth signal too weak: ${bluetoothData.rssi} dBm (threshold: ${config.rssiThreshold} dBm)`)
    }

    // Calculate distance from RSSI if txPower is available
    let estimatedDistance: number | undefined
    if (bluetoothData.txPower !== undefined) {
      estimatedDistance = this.calculateDistanceFromRSSI(bluetoothData.rssi, bluetoothData.txPower)
    } else if (bluetoothData.distance !== undefined) {
      estimatedDistance = bluetoothData.distance
    }

    // Check if other group members' devices are detected
    const detectedGroupDevices = this.findGroupDevicesInRange(bluetoothData, group)
    if (detectedGroupDevices.length === 0 && group.members.length > 1) {
      warnings.push("No other group member devices detected via Bluetooth")
    }

    // Calculate confidence based on signal strength and device detection
    let confidence = this.calculateBluetoothConfidence(bluetoothData, config, detectedGroupDevices.length)

    // Adjust confidence based on estimated distance
    if (estimatedDistance !== undefined) {
      if (estimatedDistance > 10) {
        // Beyond typical Bluetooth close range
        confidence *= 0.7
        warnings.push(`Estimated distance (${estimatedDistance.toFixed(1)}m) suggests devices may not be very close`)
      } else if (estimatedDistance <= 2) {
        // Very close range
        confidence *= 1.2
      }
    }

    const isValid = errors.length === 0 && confidence >= 60 // Minimum confidence for Bluetooth

    return {
      isValid,
      confidence: Math.min(Math.round(confidence * 100) / 100, 100),
      detectedMethods: [ProximityMethod.BLUETOOTH],
      estimatedDistance,
      reliability: this.calculateBluetoothReliability(bluetoothData, confidence, detectedGroupDevices.length),
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  checkBluetoothPairProximity(data1: BluetoothData, data2: BluetoothData, config: BluetoothConfig): boolean {
    // Check if devices can detect each other
    const device1DetectsDevice2 = data1.nearbyDevices.some((device) => device.deviceId === data2.deviceId)
    const device2DetectsDevice1 = data2.nearbyDevices.some((device) => device.deviceId === data1.deviceId)

    if (!device1DetectsDevice2 && !device2DetectsDevice1) {
      return false
    }

    // Check signal strength if devices detect each other
    if (device1DetectsDevice2) {
      const detectedDevice = data1.nearbyDevices.find((device) => device.deviceId === data2.deviceId)!
      if (detectedDevice.rssi < config.rssiThreshold) {
        return false
      }
    }

    if (device2DetectsDevice1) {
      const detectedDevice = data2.nearbyDevices.find((device) => device.deviceId === data1.deviceId)!
      if (detectedDevice.rssi < config.rssiThreshold) {
        return false
      }
    }

    return true
  }

  private calculateDistanceFromRSSI(rssi: number, txPower: number): number {
    if (rssi === 0) return -1.0

    const ratio = (txPower - rssi) / 20.0
    return Math.pow(10, ratio)
  }

  private findGroupDevicesInRange(bluetoothData: BluetoothData, group: ProximityGroup): string[] {
    const groupDeviceIds = group.members.map((member) => member.deviceId)
    return bluetoothData.nearbyDevices
      .filter((device) => groupDeviceIds.includes(device.deviceId))
      .map((device) => device.deviceId)
  }

  private calculateBluetoothConfidence(
    bluetoothData: BluetoothData,
    config: BluetoothConfig,
    detectedGroupDevices: number,
  ): number {
    let confidence = 50 // Base confidence

    // Signal strength factor
    const signalStrengthRatio = Math.max(0, (bluetoothData.rssi - config.rssiThreshold) / (0 - config.rssiThreshold))
    confidence += signalStrengthRatio * 30

    // Device detection factor
    if (detectedGroupDevices > 0) {
      confidence += Math.min(detectedGroupDevices * 10, 20)
    }

    // Nearby devices factor (more devices = more reliable environment)
    const nearbyDeviceCount = bluetoothData.nearbyDevices.length
    confidence += Math.min(nearbyDeviceCount * 2, 10)

    // Distance factor (if available)
    if (bluetoothData.distance !== undefined) {
      if (bluetoothData.distance <= 5) {
        confidence += 10
      } else if (bluetoothData.distance > 20) {
        confidence -= 20
      }
    }

    return Math.max(0, Math.min(100, confidence))
  }

  private calculateBluetoothReliability(
    bluetoothData: BluetoothData,
    confidence: number,
    detectedGroupDevices: number,
  ): ProximityReliability {
    let reliabilityScore = confidence * 0.6

    // Bonus for detecting group devices
    reliabilityScore += detectedGroupDevices * 10

    // Bonus for strong signal
    if (bluetoothData.rssi > -50) reliabilityScore += 15
    else if (bluetoothData.rssi > -70) reliabilityScore += 10

    // Bonus for distance measurement
    if (bluetoothData.distance !== undefined || bluetoothData.txPower !== undefined) {
      reliabilityScore += 10
    }

    // Penalty for very weak signal
    if (bluetoothData.rssi < -80) reliabilityScore -= 20

    if (reliabilityScore >= 85) return ProximityReliability.VERY_HIGH
    if (reliabilityScore >= 70) return ProximityReliability.HIGH
    if (reliabilityScore >= 50) return ProximityReliability.MEDIUM
    return ProximityReliability.LOW
  }
}
