import { Test, type TestingModule } from "@nestjs/testing"
import { ProximityCapsuleService } from "../services/proximity-capsule.service"
import { ProximityValidationService } from "../services/proximity-validation.service"
import { GroupManagementService } from "../services/group-management.service"
import { BluetoothProximityService } from "../services/bluetooth-proximity.service"
import { NetworkProximityService } from "../services/network-proximity.service"
import { GpsProximityService } from "../services/gps-proximity.service"
import { ProximityMethod, ProximityReliability } from "../entities/proximity-capsule.entity"
import type { CreateProximityCapsuleDto, JoinGroupDto } from "../dto/proximity-capsule.dto"

describe("ProximityCapsuleService", () => {
  let service: ProximityCapsuleService
  let proximityValidation: ProximityValidationService
  let groupManagement: GroupManagementService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProximityCapsuleService,
        ProximityValidationService,
        GroupManagementService,
        BluetoothProximityService,
        NetworkProximityService,
        GpsProximityService,
      ],
    }).compile()

    service = module.get<ProximityCapsuleService>(ProximityCapsuleService)
    proximityValidation = module.get<ProximityValidationService>(ProximityValidationService)
    groupManagement = module.get<GroupManagementService>(GroupManagementService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createProximityCapsule", () => {
    it("should create a basic proximity capsule", async () => {
      const createDto: CreateProximityCapsuleDto = {
        title: "Team Building Challenge",
        description: "Gather your team in one location",
        reward: "Team Bonus Points",
        createdBy: "admin123",
        groupConfig: {
          minGroupSize: 3,
          maxGroupSize: 10,
          requireAllAuthenticated: true,
          groupFormationTimeout: 300,
          maintainProximityDuration: 60,
        },
        proximityConfig: {
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
        },
      }

      const capsule = await service.createProximityCapsule(createDto)

      expect(capsule).toBeDefined()
      expect(capsule.title).toBe(createDto.title)
      expect(capsule.groupConfig.minGroupSize).toBe(3)
      expect(capsule.proximityConfig.detectionMethods).toContain(ProximityMethod.GPS_LOCATION)
      expect(capsule.unlocked).toBe(false)
      expect(capsule.isActive).toBe(true)
    })

    it("should throw error for invalid group configuration", async () => {
      const createDto: CreateProximityCapsuleDto = {
        title: "Invalid Capsule",
        description: "Invalid configuration",
        reward: "Nothing",
        createdBy: "admin123",
        groupConfig: {
          minGroupSize: 5,
          maxGroupSize: 3, // Invalid: max < min
          requireAllAuthenticated: true,
          groupFormationTimeout: 300,
          maintainProximityDuration: 60,
        },
        proximityConfig: {
          detectionMethods: [ProximityMethod.GPS_LOCATION],
          gpsConfig: {
            enabled: true,
            accuracyThreshold: 10,
            maxDistanceMeters: 50,
            requireHighAccuracy: false,
          },
          confidenceLevel: 80,
        },
      }

      await expect(service.createProximityCapsule(createDto)).rejects.toThrow(
        "Maximum group size cannot be less than minimum group size",
      )
    })

    it("should throw error for missing detection method configuration", async () => {
      const createDto: CreateProximityCapsuleDto = {
        title: "Missing Config",
        description: "Missing Bluetooth config",
        reward: "Nothing",
        createdBy: "admin123",
        groupConfig: {
          minGroupSize: 2,
          requireAllAuthenticated: true,
          groupFormationTimeout: 300,
          maintainProximityDuration: 60,
        },
        proximityConfig: {
          detectionMethods: [ProximityMethod.BLUETOOTH],
          // Missing bluetoothConfig
          confidenceLevel: 80,
        },
      }

      await expect(service.createProximityCapsule(createDto)).rejects.toThrow(
        "Bluetooth configuration is required when Bluetooth detection is enabled",
      )
    })
  })

  describe("joinGroup", () => {
    let capsule: any
    let joinDto: JoinGroupDto

    beforeEach(async () => {
      const createDto: CreateProximityCapsuleDto = {
        title: "Test Proximity",
        description: "Test proximity capsule",
        reward: "Test Reward",
        createdBy: "admin123",
        groupConfig: {
          minGroupSize: 2,
          maxGroupSize: 5,
          requireAllAuthenticated: true,
          groupFormationTimeout: 300,
          maintainProximityDuration: 60,
        },
        proximityConfig: {
          detectionMethods: [ProximityMethod.GPS_LOCATION],
          gpsConfig: {
            enabled: true,
            accuracyThreshold: 10,
            maxDistanceMeters: 50,
            requireHighAccuracy: false,
          },
          confidenceLevel: 75,
        },
      }

      capsule = await service.createProximityCapsule(createDto)
      joinDto = {
        capsuleId: capsule.id,
        userId: "user123",
        deviceId: "device123",
        proximityData: {
          gps: {
            latitude: 40.7128,
            longitude: -74.006,
            accuracy: 5,
            timestamp: new Date().toISOString(),
          },
        },
      }
    })

    it("should successfully join group with valid proximity data", async () => {
      // Mock proximity validation to return valid
      jest.spyOn(proximityValidation, "validateProximity").mockResolvedValue({
        isValid: true,
        confidence: 85,
        detectedMethods: [ProximityMethod.GPS_LOCATION],
        reliability: ProximityReliability.HIGH,
      })

      const result = await service.joinGroup(joinDto)

      expect(result.success).toBe(true)
      expect(result.group).toBeDefined()
      expect(result.group!.members).toHaveLength(1)
      expect(result.missingMembers).toBe(1) // Need 1 more member
    })

    it("should fail to join group with invalid proximity data", async () => {
      // Mock proximity validation to return invalid
      jest.spyOn(proximityValidation, "validateProximity").mockResolvedValue({
        isValid: false,
        confidence: 30,
        detectedMethods: [],
        reliability: ProximityReliability.LOW,
        errors: ["GPS accuracy too low"],
      })

      const result = await service.joinGroup(joinDto)

      expect(result.success).toBe(false)
      expect(result.message).toBe("Proximity validation failed")
      expect(result.proximityIssues).toContain("GPS accuracy too low")
    })

    it("should unlock capsule when minimum group size is reached", async () => {
      // Mock proximity validation to always return valid
      jest.spyOn(proximityValidation, "validateProximity").mockResolvedValue({
        isValid: true,
        confidence: 90,
        detectedMethods: [ProximityMethod.GPS_LOCATION],
        reliability: ProximityReliability.HIGH,
      })

      // Mock group proximity validation
      jest.spyOn(service as any, "validateAllMembersProximity").mockResolvedValue(true)

      // Add first member
      const result1 = await service.joinGroup(joinDto)
      expect(result1.success).toBe(true)
      expect(result1.missingMembers).toBe(1)

      // Add second member (should trigger unlock)
      const joinDto2 = {
        ...joinDto,
        userId: "user456",
        deviceId: "device456",
      }

      const result2 = await service.joinGroup(joinDto2)
      expect(result2.success).toBe(true)
      expect(result2.message).toContain("unlocked")

      // Check capsule is unlocked
      const updatedCapsule = service.getCapsule(capsule.id)
      expect(updatedCapsule.unlocked).toBe(true)
      expect(updatedCapsule.unlockedBy).toContain("user123")
      expect(updatedCapsule.unlockedBy).toContain("user456")
    })

    it("should prevent joining expired capsule", async () => {
      // Create expired capsule
      const expiredCreateDto: CreateProximityCapsuleDto = {
        title: "Expired Capsule",
        description: "This capsule has expired",
        reward: "Nothing",
        createdBy: "admin123",
        expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
        groupConfig: {
          minGroupSize: 2,
          requireAllAuthenticated: true,
          groupFormationTimeout: 300,
          maintainProximityDuration: 60,
        },
        proximityConfig: {
          detectionMethods: [ProximityMethod.GPS_LOCATION],
          gpsConfig: {
            enabled: true,
            accuracyThreshold: 10,
            maxDistanceMeters: 50,
            requireHighAccuracy: false,
          },
          confidenceLevel: 75,
        },
      }

      const expiredCapsule = await service.createProximityCapsule(expiredCreateDto)
      joinDto.capsuleId = expiredCapsule.id

      await expect(service.joinGroup(joinDto)).rejects.toThrow("This capsule has expired")
    })

    it("should prevent joining already unlocked capsule", async () => {
      // Mock successful group formation and unlock
      jest.spyOn(proximityValidation, "validateProximity").mockResolvedValue({
        isValid: true,
        confidence: 90,
        detectedMethods: [ProximityMethod.GPS_LOCATION],
        reliability: ProximityReliability.HIGH,
      })
      jest.spyOn(service as any, "validateAllMembersProximity").mockResolvedValue(true)

      // Form group and unlock capsule
      await service.joinGroup(joinDto)
      await service.joinGroup({
        ...joinDto,
        userId: "user456",
        deviceId: "device456",
      })

      // Try to join again
      await expect(
        service.joinGroup({
          ...joinDto,
          userId: "user789",
          deviceId: "device789",
        }),
      ).rejects.toThrow("This capsule has already been unlocked")
    })
  })

  describe("submitProximityCheck", () => {
    let capsule: any
    let group: any

    beforeEach(async () => {
      const createDto: CreateProximityCapsuleDto = {
        title: "Test Proximity Check",
        description: "Test proximity checking",
        reward: "Test Reward",
        createdBy: "admin123",
        groupConfig: {
          minGroupSize: 2,
          requireAllAuthenticated: true,
          groupFormationTimeout: 300,
          maintainProximityDuration: 60,
        },
        proximityConfig: {
          detectionMethods: [ProximityMethod.BLUETOOTH],
          bluetoothConfig: {
            enabled: true,
            rssiThreshold: -70,
            scanDuration: 10,
          },
          confidenceLevel: 70,
        },
      }

      capsule = await service.createProximityCapsule(createDto)

      // Create a group with a member
      jest.spyOn(proximityValidation, "validateProximity").mockResolvedValue({
        isValid: true,
        confidence: 80,
        detectedMethods: [ProximityMethod.BLUETOOTH],
        reliability: ProximityReliability.HIGH,
      })

      const joinResult = await service.joinGroup({
        capsuleId: capsule.id,
        userId: "user123",
        deviceId: "device123",
        proximityData: {
          bluetooth: {
            deviceId: "device123",
            rssi: -60,
            nearbyDevices: [],
          },
        },
      })

      group = joinResult.group
    })

    it("should successfully submit proximity check", async () => {
      const checkDto = {
        groupId: group!.id,
        userId: "user123",
        deviceId: "device123",
        detectionMethod: ProximityMethod.BLUETOOTH,
        proximityData: {
          bluetooth: {
            deviceId: "device123",
            rssi: -65,
            nearbyDevices: [
              {
                deviceId: "device456",
                rssi: -68,
                name: "User456 Phone",
              },
            ],
          },
        },
      }

      // Mock validation result
      jest.spyOn(proximityValidation, "validateProximity").mockResolvedValue({
        isValid: true,
        confidence: 85,
        detectedMethods: [ProximityMethod.BLUETOOTH],
        estimatedDistance: 3.5,
        reliability: ProximityReliability.HIGH,
      })

      const result = await service.submitProximityCheck(checkDto)

      expect(result.isValid).toBe(true)
      expect(result.confidence).toBe(85)
      expect(result.detectedMethods).toContain(ProximityMethod.BLUETOOTH)
      expect(result.estimatedDistance).toBe(3.5)
    })

    it("should handle invalid proximity check", async () => {
      const checkDto = {
        groupId: group!.id,
        userId: "user123",
        deviceId: "device123",
        detectionMethod: ProximityMethod.BLUETOOTH,
        proximityData: {
          bluetooth: {
            deviceId: "device123",
            rssi: -90, // Very weak signal
            nearbyDevices: [],
          },
        },
      }

      // Mock validation result
      jest.spyOn(proximityValidation, "validateProximity").mockResolvedValue({
        isValid: false,
        confidence: 25,
        detectedMethods: [],
        reliability: ProximityReliability.LOW,
        errors: ["Bluetooth signal too weak"],
      })

      const result = await service.submitProximityCheck(checkDto)

      expect(result.isValid).toBe(false)
      expect(result.confidence).toBe(25)
      expect(result.errors).toContain("Bluetooth signal too weak")
    })
  })

  describe("getGroupStatistics", () => {
    it("should return correct group statistics", async () => {
      // Create capsule and group
      const createDto: CreateProximityCapsuleDto = {
        title: "Stats Test",
        description: "Test statistics",
        reward: "Stats Reward",
        createdBy: "admin123",
        groupConfig: {
          minGroupSize: 2,
          requireAllAuthenticated: true,
          groupFormationTimeout: 300,
          maintainProximityDuration: 60,
        },
        proximityConfig: {
          detectionMethods: [ProximityMethod.GPS_LOCATION],
          gpsConfig: {
            enabled: true,
            accuracyThreshold: 10,
            maxDistanceMeters: 50,
            requireHighAccuracy: false,
          },
          confidenceLevel: 75,
        },
      }

      const capsule = await service.createProximityCapsule(createDto)

      // Mock proximity validation
      jest.spyOn(proximityValidation, "validateProximity").mockResolvedValue({
        isValid: true,
        confidence: 80,
        detectedMethods: [ProximityMethod.GPS_LOCATION],
        reliability: ProximityReliability.HIGH,
      })

      // Join group
      const joinResult = await service.joinGroup({
        capsuleId: capsule.id,
        userId: "user123",
        deviceId: "device123",
        proximityData: {
          gps: {
            latitude: 40.7128,
            longitude: -74.006,
            accuracy: 5,
            timestamp: new Date().toISOString(),
          },
        },
      })

      const group = joinResult.group!

      // Submit some proximity checks
      await service.submitProximityCheck({
        groupId: group.id,
        userId: "user123",
        deviceId: "device123",
        detectionMethod: ProximityMethod.GPS_LOCATION,
        proximityData: {
          gps: {
            latitude: 40.7128,
            longitude: -74.006,
            accuracy: 5,
            timestamp: new Date().toISOString(),
          },
        },
      })

      const stats = service.getGroupStatistics(group.id)

      expect(stats.groupId).toBe(group.id)
      expect(stats.memberCount).toBe(1)
      expect(stats.totalProximityChecks).toBeGreaterThan(0)
      expect(stats.validProximityChecks).toBeGreaterThan(0)
      expect(stats.averageConfidence).toBeGreaterThan(0)
      expect(stats.detectionMethodsUsed).toContain(ProximityMethod.GPS_LOCATION)
    })
  })
})
