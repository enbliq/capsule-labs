import { Injectable } from "@nestjs/common"
import type { GeoLocation } from "../entities/qr-capsule.entity"

@Injectable()
export class GeoValidationService {
  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(point1: GeoLocation, point2: GeoLocation): number {
    const R = 6371000 // Earth's radius in meters
    const lat1Rad = this.toRadians(point1.latitude)
    const lat2Rad = this.toRadians(point2.latitude)
    const deltaLatRad = this.toRadians(point2.latitude - point1.latitude)
    const deltaLonRad = this.toRadians(point2.longitude - point1.longitude)

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  /**
   * Check if a point is within a specified radius of a target location
   */
  isWithinRange(userLocation: GeoLocation, targetLocation: GeoLocation, radiusMeters: number): boolean {
    const distance = this.calculateDistance(userLocation, targetLocation)
    return distance <= radiusMeters
  }

  /**
   * Validate latitude and longitude values
   */
  isValidCoordinates(location: GeoLocation): boolean {
    const { latitude, longitude } = location
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  }

  /**
   * Get approximate address from coordinates (mock implementation)
   */
  async getApproximateAddress(location: GeoLocation): Promise<string> {
    // In a real implementation, this would use a geocoding service
    return `Lat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}`
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}
