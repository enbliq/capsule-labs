import { Test, type TestingModule } from "@nestjs/testing"
import { QrCapsuleService } from "../services/qr-capsule.service"
import { QrCodeService } from "../services/qr-code.service"
import { GeoValidationService } from "../services/geo-validation.service"
import { TimeValidationService } from "../services/time-validation.service"
import { ScanErrorCode } from "../entities/qr-capsule.entity"
import type { CreateQrCapsuleDto, ScanQrDto } from "../dto/qr-capsule.dto"

describe("QrCapsuleService", () => {
  let service: QrCapsuleService
  let qrCodeService: QrCodeService
  let geoValidationService: GeoValidationService
  let timeValidationService: TimeValidationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QrCapsuleService, QrCodeService, GeoValidationService, TimeValidationService],
    }).compile()

    service = module.get<QrCapsuleService>(QrCapsuleService)
    qrCodeService = module.get<QrCodeService>(QrCodeService)
    geoValidationService = module.get<GeoValidationService>(GeoValidationService)
    timeValidationService = module.get<TimeValidationService>(TimeValidationService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createQrCapsule", () => {
    it("should create a basic QR capsule", async () => {
      const createDto: CreateQrCapsuleDto = {
        title: "Test Capsule",
        description: "A test capsule",
        reward: "Test Reward",
        createdBy: "user123",
      }

      const capsule = await service.createQrCapsule(createDto)

      expect(capsule).toBeDefined()
      expect(capsule.title).toBe(createDto.title)
      expect(capsule.qrCodeHash).toBeDefined()
      expect(capsule.unlocked).toBe(false)
      expect(capsule.isActive).toBe(true)
    })

    it("should create a geo-locked capsule", async () => {
      const createDto: CreateQrCapsuleDto = {
        title: "Geo Capsule",
        description: "A geo-locked capsule",
        reward: "Location Reward",
        createdBy: "user123",
        geoLocked: true,
        latitude: 40.7128,
        longitude: -74.006,
        radiusMeters: 100,
      }

      const capsule = await service.createQrCapsule(createDto)

      expect(capsule.geoLocked).toBe(true)
      expect(capsule.latitude).toBe(40.7128)
      expect(capsule.longitude).toBe(-74.006)
      expect(capsule.radiusMeters).toBe(100)
    })

    it("should throw error for geo-locked capsule without coordinates", async () => {
      const createDto: CreateQrCapsuleDto = {
        title: "Invalid Geo Capsule",
        description: "Missing coordinates",
        reward: "Reward",
        createdBy: "user123",
        geoLocked: true,
      }

      await expect(service.createQrCapsule(createDto)).rejects.toThrow()
    })
  })

  describe("scanQrCode", () => {
    let capsule: any
    let scanDto: ScanQrDto

    beforeEach(async () => {
      const createDto: CreateQrCapsuleDto = {
        title: "Test Capsule",
        description: "A test capsule",
        reward: "Test Reward",
        createdBy: "user123",
      }

      capsule = await service.createQrCapsule(createDto)
      scanDto = {
        qrCodeHash: capsule.qrCodeHash,
        userId: "scanner123",
      }
    })

    it("should successfully scan and unlock a valid QR code", async () => {
      const result = await service.scanQrCode(scanDto)

      expect(result.success).toBe(true)
      expect(result.capsule).toBeDefined()
      expect(result.reward).toBe("Test Reward")
      expect(result.message).toContain("Congratulations")
    })

    it("should fail with invalid QR code hash", async () => {
      scanDto.qrCodeHash = "invalid_hash"

      const result = await service.scanQrCode(scanDto)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ScanErrorCode.INVALID_QR)
    })

    it("should fail when user already unlocked the capsule", async () => {
      // First scan - should succeed
      await service.scanQrCode(scanDto)

      // Second scan - should fail
      const result = await service.scanQrCode(scanDto)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ScanErrorCode.ALREADY_UNLOCKED)
    })

    it("should fail with expired capsule", async () => {
      // Create expired capsule
      const expiredCreateDto: CreateQrCapsuleDto = {
        title: "Expired Capsule",
        description: "An expired capsule",
        reward: "Expired Reward",
        createdBy: "user123",
        expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      }

      const expiredCapsule = await service.createQrCapsule(expiredCreateDto)
      scanDto.qrCodeHash = expiredCapsule.qrCodeHash

      const result = await service.scanQrCode(scanDto)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ScanErrorCode.EXPIRED)
    })

    it("should fail with geo-locked capsule without location", async () => {
      const geoCreateDto: CreateQrCapsuleDto = {
        title: "Geo Capsule",
        description: "A geo-locked capsule",
        reward: "Geo Reward",
        createdBy: "user123",
        geoLocked: true,
        latitude: 40.7128,
        longitude: -74.006,
        radiusMeters: 100,
      }

      const geoCapsule = await service.createQrCapsule(geoCreateDto)
      scanDto.qrCodeHash = geoCapsule.qrCodeHash

      const result = await service.scanQrCode(scanDto)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ScanErrorCode.GEO_RESTRICTED)
    })

    it("should succeed with geo-locked capsule within range", async () => {
      const geoCreateDto: CreateQrCapsuleDto = {
        title: "Geo Capsule",
        description: "A geo-locked capsule",
        reward: "Geo Reward",
        createdBy: "user123",
        geoLocked: true,
        latitude: 40.7128,
        longitude: -74.006,
        radiusMeters: 100,
      }

      const geoCapsule = await service.createQrCapsule(geoCreateDto)
      scanDto.qrCodeHash = geoCapsule.qrCodeHash
      scanDto.location = {
        latitude: 40.7128, // Same location
        longitude: -74.006,
      }

      // Mock geo validation to return true
      jest.spyOn(geoValidationService, "isWithinRange").mockReturnValue(true)

      const result = await service.scanQrCode(scanDto)

      expect(result.success).toBe(true)
    })

    it("should fail with time-restricted capsule outside time window", async () => {
      const timeCreateDto: CreateQrCapsuleDto = {
        title: "Time Capsule",
        description: "A time-restricted capsule",
        reward: "Time Reward",
        createdBy: "user123",
        timeWindow: {
          startTime: "09:00",
          endTime: "17:00",
          daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
        },
      }

      const timeCapsule = await service.createQrCapsule(timeCreateDto)
      scanDto.qrCodeHash = timeCapsule.qrCodeHash

      // Mock time validation to return false
      jest.spyOn(timeValidationService, "isWithinTimeWindow").mockReturnValue(false)

      const result = await service.scanQrCode(scanDto)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ScanErrorCode.TIME_RESTRICTED)
    })
  })

  describe("getUserUnlocks", () => {
    it("should return empty array for user with no unlocks", () => {
      const unlocks = service.getUserUnlocks("user123")
      expect(unlocks).toEqual([])
    })

    it("should return unlocked capsules for user", async () => {
      const createDto: CreateQrCapsuleDto = {
        title: "Test Capsule",
        description: "A test capsule",
        reward: "Test Reward",
        createdBy: "user123",
      }

      const capsule = await service.createQrCapsule(createDto)
      const scanDto: ScanQrDto = {
        qrCodeHash: capsule.qrCodeHash,
        userId: "scanner123",
      }

      await service.scanQrCode(scanDto)

      const unlocks = service.getUserUnlocks("scanner123")
      expect(unlocks).toHaveLength(1)
      expect(unlocks[0].id).toBe(capsule.id)
    })
  })
})
