import { Test, type TestingModule } from "@nestjs/testing"
import { TwilightCalculationService } from "../services/twilight-calculation.service"
import * as SunCalc from "suncalc"

jest.mock("suncalc", () => ({
  getTimes: jest.fn(),
}))

describe("TwilightCalculationService", () => {
  let service: TwilightCalculationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TwilightCalculationService],
    }).compile()

    service = module.get<TwilightCalculationService>(TwilightCalculationService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("calculateTwilightTimes", () => {
    it("should calculate twilight times correctly", () => {
      // Mock the SunCalc.getTimes function
      const mockDate = new Date("2023-01-01T12:00:00Z")
      const mockTomorrowDate = new Date("2023-01-02T12:00:00Z")

      const mockTodayTimes = {
        goldenHour: new Date("2023-01-01T18:00:00Z"),
        dusk: new Date("2023-01-01T19:30:00Z"),
      }

      const mockTomorrowTimes = {
        goldenHour: new Date("2023-01-02T18:00:00Z"),
        dusk: new Date("2023-01-02T19:30:00Z"),
      }
      ;(SunCalc.getTimes as jest.Mock).mockImplementation((date) => {
        if (date.getDate() === mockDate.getDate()) {
          return mockTodayTimes
        } else {
          return mockTomorrowTimes
        }
      })

      const result = service.calculateTwilightTimes(40.7128, -74.006, mockDate)

      expect(result).toEqual({
        twilightStart: mockTodayTimes.goldenHour,
        twilightEnd: mockTodayTimes.dusk,
        nextTwilightStart: mockTomorrowTimes.goldenHour,
        nextTwilightEnd: mockTomorrowTimes.dusk,
      })

      expect(SunCalc.getTimes).toHaveBeenCalledTimes(2)
      expect(SunCalc.getTimes).toHaveBeenCalledWith(mockDate, 40.7128, -74.006)
      expect(SunCalc.getTimes).toHaveBeenCalledWith(mockTomorrowDate, 40.7128, -74.006)
    })
  })

  describe("isCurrentlyTwilight", () => {
    it("should return true when current time is within twilight", () => {
      // Mock the current time to be within twilight
      const mockNow = new Date("2023-01-01T18:30:00Z")
      jest.spyOn(global, "Date").mockImplementation(() => mockNow as unknown as string)

      // Mock the calculateTwilightTimes method
      jest.spyOn(service, "calculateTwilightTimes").mockReturnValue({
        twilightStart: new Date("2023-01-01T18:00:00Z"),
        twilightEnd: new Date("2023-01-01T19:30:00Z"),
        nextTwilightStart: new Date("2023-01-02T18:00:00Z"),
        nextTwilightEnd: new Date("2023-01-02T19:30:00Z"),
      })

      const result = service.isCurrentlyTwilight(40.7128, -74.006)

      expect(result).toBe(true)
      expect(service.calculateTwilightTimes).toHaveBeenCalledWith(40.7128, -74.006, mockNow)
    })

    it("should return false when current time is before twilight", () => {
      // Mock the current time to be before twilight
      const mockNow = new Date("2023-01-01T17:30:00Z")
      jest.spyOn(global, "Date").mockImplementation(() => mockNow as unknown as string)

      // Mock the calculateTwilightTimes method
      jest.spyOn(service, "calculateTwilightTimes").mockReturnValue({
        twilightStart: new Date("2023-01-01T18:00:00Z"),
        twilightEnd: new Date("2023-01-01T19:30:00Z"),
        nextTwilightStart: new Date("2023-01-02T18:00:00Z"),
        nextTwilightEnd: new Date("2023-01-02T19:30:00Z"),
      })

      const result = service.isCurrentlyTwilight(40.7128, -74.006)

      expect(result).toBe(false)
    })

    it("should return false when current time is after twilight", () => {
      // Mock the current time to be after twilight
      const mockNow = new Date("2023-01-01T20:00:00Z")
      jest.spyOn(global, "Date").mockImplementation(() => mockNow as unknown as string)

      // Mock the calculateTwilightTimes method
      jest.spyOn(service, "calculateTwilightTimes").mockReturnValue({
        twilightStart: new Date("2023-01-01T18:00:00Z"),
        twilightEnd: new Date("2023-01-01T19:30:00Z"),
        nextTwilightStart: new Date("2023-01-02T18:00:00Z"),
        nextTwilightEnd: new Date("2023-01-02T19:30:00Z"),
      })

      const result = service.isCurrentlyTwilight(40.7128, -74.006)

      expect(result).toBe(false)
    })
  })
})
