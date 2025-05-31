import { Test, type TestingModule } from "@nestjs/testing"
import { QrCodeService } from "../services/qr-code.service"

describe("QrCodeService", () => {
  let service: QrCodeService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QrCodeService],
    }).compile()

    service = module.get<QrCodeService>(QrCodeService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("generateQrCodeHash", () => {
    it("should generate a unique hash for each capsule", async () => {
      const hash1 = await service.generateQrCodeHash("capsule1")
      const hash2 = await service.generateQrCodeHash("capsule2")

      expect(hash1).toBeDefined()
      expect(hash2).toBeDefined()
      expect(hash1).not.toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA256 hash length
    })

    it("should generate different hashes for same capsule ID", async () => {
      const hash1 = await service.generateQrCodeHash("capsule1")
      const hash2 = await service.generateQrCodeHash("capsule1")

      expect(hash1).not.toBe(hash2) // Should be different due to timestamp and random bytes
    })
  })

  describe("validateQrCodeHash", () => {
    it("should return true for valid SHA256 hash", () => {
      const validHash = "a".repeat(64) // 64 character hex string

      const result = service.validateQrCodeHash(validHash)

      expect(result).toBe(true)
    })

    it("should return false for invalid hash format", () => {
      const invalidHash = "invalid_hash"

      const result = service.validateQrCodeHash(invalidHash)

      expect(result).toBe(false)
    })

    it("should return false for hash with wrong length", () => {
      const shortHash = "a".repeat(32) // Too short

      const result = service.validateQrCodeHash(shortHash)

      expect(result).toBe(false)
    })
  })

  describe("generateQrCodeData", () => {
    it("should return the hash as QR code data", async () => {
      const hash = "test_hash_123"

      const qrData = await service.generateQrCodeData(hash)

      expect(qrData).toBe(hash)
    })
  })

  describe("generateQrCodeUrl", () => {
    it("should generate a valid QR code URL", async () => {
      const hash = "test_hash_123"

      const url = await service.generateQrCodeUrl(hash)

      expect(url).toContain("qrserver.com")
      expect(url).toContain("200x200")
      expect(url).toContain(encodeURIComponent(hash))
    })

    it("should use custom base URL when provided", async () => {
      const hash = "test_hash_123"
      const customBaseUrl = "https://custom-qr-service.com/"

      const url = await service.generateQrCodeUrl(hash, customBaseUrl)

      expect(url).toContain("custom-qr-service.com")
    })
  })
})
