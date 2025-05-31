import { Test, type TestingModule } from "@nestjs/testing"
import { GeoValidationService } from "../services/geo-validation.service"

describe("GeoValidationService", () => {
  let service: GeoValidationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeoValidationService],
    }).compile()

    service = module.get<GeoValidationService>(GeoValidationService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("calculateDistance", () => {
    it("should calculate distance between two points", () => {
      const point1 = { latitude: 40.7128, longitude: -74.006 } // NYC
      const point2 = { latitude: 34.0522, longitude: -118.2437 } // LA

      const distance = service.calculateDistance(point1, point2)

      // Distance between NYC and LA is approximately 3,944 km
      expect(distance).toBeGreaterThan(3900000) // 3,900 km
      expect(distance).toBeLessThan(4000000) // 4,000 km
    })

    it("should return 0 for same coordinates", () => {
      const point = { latitude: 40.7128, longitude: -74.006 }

      const distance = service.calculateDistance(point, point)

      expect(distance).toBe(0)
    })
  })

  describe("isWithinRange", () => {
    it("should return true for points within range", () => {
      const center = { latitude: 40.7128, longitude: -74.006 }
      const nearby = { latitude: 40.7129, longitude: -74.0061 } // Very close

      const isWithin = service.isWithinRange(nearby, center, 100) // 100 meters

      expect(isWithin).toBe(true)
    })

    it("should return false for points outside range", () => {
      const center = { latitude: 40.7128, longitude: -74.006 }
      const faraway = { latitude: 41.7128, longitude: -75.006 } // Much farther

      const isWithin = service.isWithinRange(faraway, center, 100) // 100 meters

      expect(isWithin).toBe(false)
    })
  })

  describe("isValidCoordinates", () => {
    it("should return true for valid coordinates", () => {
      const validLocation = { latitude: 40.7128, longitude: -74.006 }

      expect(service.isValidCoordinates(validLocation)).toBe(true)
    })

    it("should return false for invalid latitude", () => {
      const invalidLocation = { latitude: 91, longitude: -74.006 }

      expect(service.isValidCoordinates(invalidLocation)).toBe(false)
    })

    it("should return false for invalid longitude", () => {
      const invalidLocation = { latitude: 40.7128, longitude: 181 }

      expect(service.isValidCoordinates(invalidLocation)).toBe(false)
    })
  })
})
