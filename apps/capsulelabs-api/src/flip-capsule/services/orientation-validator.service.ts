import { Injectable, Logger } from "@nestjs/common"
import type { OrientationDataDto } from "../dto/orientation.dto"
import type { FlipChallengeConfig } from "../entities/flip-capsule.entity"

@Injectable()
export class OrientationValidatorService {
  private readonly logger = new Logger(OrientationValidatorService.name)

  /**
   * Determines if the device is currently in a flipped state based on orientation data
   */
  isDeviceFlipped(orientation: OrientationDataDto, config: FlipChallengeConfig): boolean {
    // Primary check: beta angle (device tilt front-to-back)
    // When phone is upside down, beta is typically > 150 degrees
    const isBetaFlipped = Math.abs(orientation.beta) > config.betaThreshold

    // Secondary check: gamma angle (device tilt side-to-side)
    // This is less important for detecting upside-down, but can be used for stability
    const isGammaStable = Math.abs(orientation.gamma) < config.stabilityThreshold

    // If accelerometer data is available, use it as an additional check
    if (orientation.accelerometer) {
      // When phone is upside down, z-axis acceleration is typically negative
      const isAccelerometerFlipped = orientation.accelerometer.z < -5

      return isBetaFlipped && isGammaStable && isAccelerometerFlipped
    }

    // If no accelerometer data, rely only on orientation angles
    return isBetaFlipped && isGammaStable
  }

  /**
   * Calculates the stability of the device orientation
   * Returns a value between 0 (unstable) and 1 (perfectly stable)
   */
  calculateStability(
    current: OrientationDataDto,
    previous: OrientationDataDto | null,
    config: FlipChallengeConfig,
  ): number {
    if (!previous) return 1 // No previous data to compare

    // Calculate angular changes
    const alphaDiff = this.calculateAngleDifference(current.alpha, previous.alpha)
    const betaDiff = Math.abs(current.beta - previous.beta)
    const gammaDiff = Math.abs(current.gamma - previous.gamma)

    // Total movement (weighted sum)
    const totalMovement = alphaDiff * 0.2 + betaDiff * 0.5 + gammaDiff * 0.3

    // Convert to stability score (0-1)
    const stability = Math.max(0, 1 - totalMovement / config.stabilityThreshold)

    return stability
  }

  /**
   * Calculates the difference between two angles, accounting for 0-360 wraparound
   */
  private calculateAngleDifference(angle1: number, angle2: number): number {
    const diff = Math.abs(angle1 - angle2)
    return diff > 180 ? 360 - diff : diff
  }

  /**
   * Validates if the device has the necessary sensors for the flip challenge
   */
  validateDeviceCapabilities(orientation: OrientationDataDto): {
    hasRequiredSensors: boolean
    missingFeatures: string[]
  } {
    const missingFeatures: string[] = []

    // Check if orientation data is available
    if (orientation.alpha === undefined || orientation.beta === undefined || orientation.gamma === undefined) {
      missingFeatures.push("deviceOrientation")
    }

    // Check if absolute orientation is available (if required)
    if (orientation.absolute === undefined) {
      missingFeatures.push("absoluteOrientation")
    }

    // Check if accelerometer data is available
    if (!orientation.accelerometer) {
      missingFeatures.push("accelerometer")
    }

    return {
      hasRequiredSensors: missingFeatures.length === 0,
      missingFeatures,
    }
  }

  /**
   * Determines the current device orientation mode
   */
  getDeviceOrientationMode(
    orientation: OrientationDataDto,
  ): "portrait" | "landscape" | "portrait-secondary" | "landscape-secondary" {
    // If the device provides its own orientation, use that
    if (orientation.deviceOrientation) {
      return orientation.deviceOrientation
    }

    // Otherwise, determine from gamma angle
    const gamma = orientation.gamma
    const beta = orientation.beta

    if (Math.abs(gamma) < 45) {
      // Device is mostly vertical
      return beta < 0 ? "portrait" : "portrait-secondary"
    } else {
      // Device is mostly horizontal
      return gamma > 0 ? "landscape" : "landscape-secondary"
    }
  }

  /**
   * Logs orientation data for debugging
   */
  logOrientationData(orientation: OrientationDataDto, isFlipped: boolean): void {
    this.logger.debug(
      `Orientation - Alpha: ${orientation.alpha.toFixed(1)}°, Beta: ${orientation.beta.toFixed(1)}°, Gamma: ${orientation.gamma.toFixed(1)}° - Flipped: ${isFlipped}`,
    )
  }
}
