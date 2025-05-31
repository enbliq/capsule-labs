import { Test, type TestingModule } from "@nestjs/testing"
import { BluetoothProximityService } from "../services/bluetooth-proximity.service"
import { ProximityMethod, ProximityReliability } from "../entities/proximity-capsule.entity"
import type { BluetoothData, BluetoothConfig, ProximityGroup } from "../entities/proximity-capsule.entity"

describe("BluetoothProximityService", () => {
  let service: BluetoothProximityService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BluetoothProximityService],
    }).compile()

    service = module.get<BluetoothProximityService>(BluetoothProximityService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("validateBluetoothProximity", () => {
    const mockConfig: BluetoothConfig = {
      enabled: true,
      rssiThreshold: -70,
      scanDuration: 10,
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
          proximityData: {},
        },
        {
          userId: "user2",
          deviceId: "device2",
          joinedAt: new Date(),
          lastSeen: new Date(),
          isAuthenticated: true,
          proximityData: {},
        },
      ],
      status: "active" as any,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 300000),
      proximityChecks: [],
    }

    it("should validate strong Bluetooth signal", async () => {
      const bluetoothData: BluetoothData = {
        deviceId: "device1",
        rssi: -60, // Strong signal
        nearbyDevices: [
          {
            deviceId: "device2",
            rssi: -65,
            name: "User2 Phone",
          },
        ],
      }

      const result = await service.validateBluetoothProximity(bluetoothData, mockConfig, mockGroup)

      expect(result.isValid).toBe(true)
      expect(result.confidence).toBeGreaterThan(70)
      expect(result.detectedMethods).toContain(ProximityMethod.BLUETOOTH)
      expect(result.reliability).toBe(ProximityReliability.HIGH)
    })

    it("should reject weak Bluetooth signal", async () => {
      const bluetoothData: BluetoothData = {
        deviceId: "device1",
        rssi: -85, // Weak signal below threshold
        nearbyDevices: [],
      }

      const result = await service.validateBluetoothProximity(bluetoothData, mockConfig, mockGroup)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Bluetooth signal too weak: -85 dBm (threshold: -70 dBm)")
    })

    it("should calculate distance from RSSI and txPower", async () => {
      const bluetoothData: BluetoothData = {
        deviceId: "device1",
        rssi: -60,
        txPower: -59, // 1 meter reference
        nearbyDevices: [],
      }

      const result = await service.validateBluetoothProximity(bluetoothData, mockConfig, mockGroup)

      expect(result.estimatedDistance).toBeDefined()
      expect(result.estimatedDistance).toBeGreaterThan(0)
    })

    it("should detect group member devices", async () => {
      const bluetoothData: BluetoothData = {
        deviceId: "device1",
        rssi: -65,
        nearbyDevices: [
          {
            deviceId: "device2", // Group member device
            rssi: -68,
            name: "User2 Phone",
          },
          {
            deviceId: "unknown_device",
            rssi: -70,
            name: "Unknown Device",
          },
        ],
      }

      const result = await service.validateBluetoothProximity(bluetoothData, mockConfig, mockGroup)

      expect(result.isValid).toBe(true)
      expect(result.confidence).toBeGreaterThan(80) // Bonus for detecting group devices
    })
  })

  describe("checkBluetoothPairProximity", () => {
    const mockConfig: BluetoothConfig = {
      enabled: true,
      rssiThreshold: -70,
      scanDuration: 10,
    }

    it("should validate mutual device detection", () => {
      const data1: BluetoothData = {
        deviceId: "device1",
        rssi: -60,
        nearbyDevices: [
          {
            deviceId: "device2",
            rssi: -65,
          },
        ],
      }

      const data2: BluetoothData = {
        deviceId: "device2",
        rssi: -62,
        nearbyDevices: [
          {
            deviceId: "device1",
            rssi: -67,
          },
        ],
      }

      const result = service.checkBluetoothPairProximity(data1, data2, mockConfig)
      expect(result).toBe(true)
    })

    it("should reject if devices cannot detect each other", () => {
      const data1: BluetoothData = {
        deviceId: "device1",
        rssi: -60,
        nearbyDevices: [], // No nearby devices
      }

      const data2: BluetoothData = {
        deviceId: "device2",
        rssi: -62,
        nearbyDevices: [], // No nearby devices
      }

      const result = service.checkBluetoothPairProximity(data1, data2, mockConfig)
      expect(result).toBe(false)
    })

    it("should reject if signal is too weak", () => {
      const data1: BluetoothData = {
        deviceId: "device1",
        rssi: -60,
        nearbyDevices: [
          {
            deviceId: "device2",
            rssi: -85, // Too weak
          },
        ],
      }

      const data2: BluetoothData = {
        deviceId: "device2",
        rssi: -62,
        nearbyDevices: [
          {
            deviceId: "device1",
            rssi: -67,
          },
        ],
      }

      const result = service.checkBluetoothPairProximity(data1, data2, mockConfig)
      expect(result).toBe(false)
    })
  })
})
