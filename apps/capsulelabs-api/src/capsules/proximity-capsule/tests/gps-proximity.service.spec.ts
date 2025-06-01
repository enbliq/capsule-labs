import { Test, type TestingModule } from "@nestjs/testing"
import { GpsProximityService } from "../services/gps-proximity.service"
import { ProximityMethod, ProximityReliability } from "../entities/proximity-capsule.entity"
import type { GpsData, GpsConfig, ProximityGroup } from "../entities/proximity-capsule.entity"

describe("GpsProximityService", () => {
  let service: GpsProximityService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GpsProximityService],
    }).compile()

    service = module.get<GpsProximityService>(GpsProximityService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("calculateDistance", () => {
    it("should calculate distance between two GPS points", () => {
      const gps1: GpsData = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 5,
        timestamp: new Date(),
      }

      const gps2: GpsData = {
        latitude: 40.7129, // Very close
        longitude: -74.0061,
        accuracy: 5,
        timestamp: new Date(),
      }

      const distance = service.calculateDistance(gps1, gps2)

      expect(distance).toBeGreaterThan(0)
      expect(distance).toBeLessThan(20) // Should be very close (less than 20 meters)
    })

    it("should return 0 for identical coordinates", () => {
      const gps: GpsData = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 5,
        timestamp: new Date(),
      }

      const distance = service.calculateDistance(gps, gps)
      expect(distance).toBe(0)
    })

    it("should calculate larger distances correctly", () => {
      const nyc: GpsData = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 5,
        timestamp: new Date(),
      }

      const la: GpsData = {
        latitude: 34.0522,
        longitude: -118.2437,
        accuracy: 5,
        timestamp: new Date(),
      }

      const distance = service.calculateDistance(nyc, la)

      // Distance between NYC and LA is approximately 3,944 km
      expect(distance).toBeGreaterThan(3900000) // 3,900 km
      expect(distance).toBeLessThan(4000000) // 4,000 km
    })
  })

  describe("validateGpsProximity", () => {
    const mockConfig: GpsConfig = {
      enabled: true,
      accuracyThreshold: 10,
      maxDistanceMeters: 50,
      requireHighAccuracy: false,
    }

    const mockGroup: ProximityGroup = {
      id: "group123",
      capsuleId: "capsule123",
      members: [
        {
          userId: "user1",
          deviceId: "device1",
          joinedAt: new Date(),
          lastSeen: new Date(),
          isAuthenticated: true,
          proximityData: {
            gps: {
              latitude: 40.7128,
              longitude: -74.006,
              accuracy: 5,
              timestamp: new Date(),
            },
          },
        },
      ],
      status: "active" as any,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 300000),
      proximityChecks: [],
    }

    it("should validate accurate GPS data within distance threshold", async () => {
      const gpsData: GpsData = {
        latitude: 40.7129, // Very close to group member
        longitude: -74.0061,
        accuracy: 5, // Good accuracy
        timestamp: new Date(),
      }

      const result = await service.validateGpsProximity(gpsData, mockConfig, mockGroup)

      expect(result.isValid).toBe(true)
      expect(result.confidence).toBeGreaterThan(80)
      expect(result.detectedMethods).toContain(ProximityMethod.GPS_LOCATION)
      expect(result.estimatedDistance).toBeLessThan(50)
    })

    it("should reject GPS data with poor accuracy when high accuracy required", async () => {
      const strictConfig: GpsConfig = {
        ...mockConfig,
        requireHighAccuracy: true,
        accuracyThreshold: 5,
      }

      const gpsData: GpsData = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 15, // Poor accuracy
        timestamp: new Date(),
      }

      const result = await service.validateGpsProximity(gpsData, strictConfig, mockGroup)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("GPS accuracy too low: 15m (threshold: 5m)")
    })

    it("should reject GPS data when distance exceeds threshold", async () => {
      const gpsData: GpsData = {
        latitude: 40.72, // Far from group member
        longitude: -74.01,
        accuracy: 5,
        timestamp: new Date(),
      }

      const result = await service.validateGpsProximity(gpsData, mockConfig, mockGroup)

      expect(result.isValid).toBe(false)
      expect(result.errors?.[0]).toContain("Distance to nearest group member")
      expect(result.errors?.[0]).toContain("exceeds threshold")
    })

    it("should warn about old GPS data", async () => {
      const gpsData: GpsData = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 5,
        timestamp: new Date(Date.now() - 120000), // 2 minutes old
      }

      const result = await service.validateGpsProximity(gpsData, mockConfig, mockGroup)

      expect(result.warnings).toBeDefined()
      expect(result.warnings?.[0]).toContain("GPS data is")
      expect(result.warnings?.[0]).toContain("seconds old")
    })

    it("should give bonus confidence for very close proximity", async () => {
      const gpsData: GpsData = {
        latitude: 40.71281, // Extremely close
        longitude: -74.00601,
        accuracy: 3, // Very accurate
        timestamp: new Date(),
      }

      const result = await service.validateGpsProximity(gpsData, mockConfig, mockGroup)

      expect(result.isValid).toBe(true)
      expect(result.confidence).toBeGreaterThan(90) // High confidence for close proximity
      expect(result.reliability).toBe(ProximityReliability.VERY_HIGH)
    })

    it("should handle group with no GPS data", async () => {
      const emptyGroup: ProximityGroup = {
        ...mockGroup,
        members: [
          {
            userId: "user1",
            deviceId: "device1",
            joinedAt: new Date(),
            lastSeen: new Date(),
            isAuthenticated: true,
            proximityData: {}, // No GPS data
          },
        ],
      }

      const gpsData: GpsData = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 5,
        timestamp: new Date(),
      }

      const result = await service.validateGpsProximity(gpsData, mockConfig, emptyGroup)

      expect(result.isValid).toBe(true) // Should still be valid, just no distance comparison
      expect(result.estimatedDistance).toBeUndefined()
    })
  })
})
