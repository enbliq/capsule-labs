import { Test, type TestingModule } from "@nestjs/testing"
import { ProximityValidationService } from "../services/proximity-validation.service"
import { BluetoothProximityService } from "../services/bluetooth-proximity.service"
import { NetworkProximityService } from "../services/network-proximity.service"
import { GpsProximityService } from "../services/gps-proximity.service"
import { ProximityMethod, ProximityReliability } from "../entities/proximity-capsule.entity"
import type { ProximityData, ProximityConfig, ProximityGroup } from "../entities/proximity-capsule.entity"

describe("ProximityValidationService", () => {
  let service: ProximityValidationService
  let bluetoothService: BluetoothProximityService
  let networkService: NetworkProximityService
  let gpsService: GpsProximityService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProximityValidationService,
        BluetoothProximityService,
        NetworkProximityService,
        GpsProximityService,
      ],
    }).compile()

    service = module.get<ProximityValidationService>(ProximityValidationService)
    bluetoothService = module.get<BluetoothProximityService>(BluetoothProximityService)
    networkService = module.get<NetworkProximityService>(NetworkProximityService)
    gpsService = module.get<GpsProximityService>(GpsProximityService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("validateProximity", () => {
    const mockGroup: ProximityGroup = {
      id: "group123",
      capsuleId: "capsule123",
      members: [],
      status: "active" as any,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 300000),
      proximityChecks: [],
    }

    it("should validate single detection method", async () => {
      const proximityData: ProximityData = {
        gps: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 5,
          timestamp: new Date(),
        },
      }

      const config: ProximityConfig = {
        detectionMethods: [ProximityMethod.GPS_LOCATION],
        gpsConfig: {
          enabled: true,
          accuracyThreshold: 10,
          maxDistanceMeters: 50,
          requireHighAccuracy: false,
        },
        confidenceLevel: 75,
      }

      // Mock GPS validation
      jest.spyOn(gpsService, "validateGpsProximity").mockResolvedValue({
        isValid: true,
        confidence: 85,
        detectedMethods: [ProximityMethod.GPS_LOCATION],
        estimatedDistance: 10,
        reliability: ProximityReliability.HIGH,
      })

      const result = await service.validateProximity(proximityData, config, mockGroup)

      expect(result.isValid).toBe(true)
      expect(result.confidence).toBeGreaterThan(75)
      expect(result.detectedMethods).toContain(ProximityMethod.GPS_LOCATION)
      expect(result.estimatedDistance).toBe(10)
    })

    it("should combine multiple detection methods", async () => {
      const proximityData: ProximityData = {
        gps: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 5,
          timestamp: new Date(),
        },
        bluetooth: {
          deviceId: "device123",
          rssi: -65,
          nearbyDevices: [],
        },
      }

      const config: ProximityConfig = {
        detectionMethods: [ProximityMethod.GPS_LOCATION, ProximityMethod.BLUETOOTH],
        gpsConfig: {
          enabled: true,
          accuracyThreshold: 10,
          maxDistanceMeters: 50,
          requireHighAccuracy: false,
        },
        bluetoothConfig: {
          enabled: true,
          rssiThreshold: -70,
          scanDuration: 10,
        },
        confidenceLevel: 80,
      }

      // Mock both validations
      jest.spyOn(gpsService, "validateGpsProximity").mockResolvedValue({
        isValid: true,
        confidence: 85,
        detectedMethods: [ProximityMethod.GPS_LOCATION],
        estimatedDistance: 8,
        reliability: ProximityReliability.HIGH,
      })

      jest.spyOn(bluetoothService, "validateBluetoothProximity").mockResolvedValue({
        isValid: true,
        confidence: 80,
        detectedMethods: [ProximityMethod.BLUETOOTH],
        estimatedDistance: 5,
        reliability: ProximityReliability.HIGH,
      })

      const result = await service.validateProximity(proximityData, config, mockGroup)

      expect(result.isValid).toBe(true)
      expect(result.confidence).toBeGreaterThan(80) // Combined confidence
      expect(result.detectedMethods).toContain(ProximityMethod.GPS_LOCATION)
      expect(result.detectedMethods).toContain(ProximityMethod.BLUETOOTH)
      expect(result.reliability).toBe(ProximityRe\
