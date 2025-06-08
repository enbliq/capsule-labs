import { Test, type TestingModule } from "@nestjs/testing"
import { ObjectDetectionService } from "../services/object-detection.service"
import { ConfigService } from "@nestjs/config"
import { HttpService } from "@nestjs/axios"
import { of } from "rxjs"
import { jest } from "@jest/globals"

describe("ObjectDetectionService", () => {
  let service: ObjectDetectionService
  let configService: ConfigService
  let httpService: HttpService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjectDetectionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                VISION_API_KEY: "",
                VISION_API_ENDPOINT: "",
                USE_EXTERNAL_VISION_API: false,
              }
              return config[key] || defaultValue
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<ObjectDetectionService>(ObjectDetectionService)
    configService = module.get<ConfigService>(ConfigService)
    httpService = module.get<HttpService>(HttpService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("detectObjects", () => {
    it("should return mock detection results when external API is disabled", async () => {
      const imageUrl = "https://example.com/test-image.jpg"
      const result = await service.detectObjects(imageUrl)

      expect(result).toHaveProperty("labels")
      expect(result).toHaveProperty("colors")
      expect(result).toHaveProperty("confidence")
      expect(result).toHaveProperty("rawResponse")
      expect(Array.isArray(result.labels)).toBe(true)
      expect(Array.isArray(result.colors)).toBe(true)
      expect(typeof result.confidence).toBe("number")
    })

    it("should use external API when configured", async () => {
      // Mock external API response
      const mockResponse = {
        data: {
          responses: [
            {
              labelAnnotations: [
                { description: "cat", score: 0.9 },
                { description: "animal", score: 0.8 },
              ],
              imagePropertiesAnnotation: {
                dominantColors: {
                  colors: [{ color: { red: 255, green: 0, blue: 0 } }],
                },
              },
            },
          ],
        },
      }

      jest.spyOn(configService, "get").mockImplementation((key: string) => {
        if (key === "USE_EXTERNAL_VISION_API") return true
        if (key === "VISION_API_KEY") return "test-key"
        if (key === "VISION_API_ENDPOINT") return "https://api.example.com"
        return ""
      })

      jest.spyOn(httpService, "post").mockReturnValue(of(mockResponse))

      const imageUrl = "https://example.com/cat.jpg"
      const result = await service.detectObjects(imageUrl)

      expect(result.labels).toContain("cat")
      expect(result.labels).toContain("animal")
      expect(result.confidence).toBeGreaterThan(0)
    })
  })

  describe("matchImageToTheme", () => {
    it("should match detected objects to theme keywords", () => {
      const detectionResults = {
        labels: ["cat", "animal", "pet"],
        colors: ["brown", "white"],
      }
      const themeKeywords = ["animal", "pet", "furry"]

      const result = service.matchImageToTheme(detectionResults, themeKeywords)

      expect(result.isMatch).toBe(true)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.matchedKeywords).toContain("animal")
      expect(result.matchedKeywords).toContain("pet")
    })

    it("should not match when no keywords overlap", () => {
      const detectionResults = {
        labels: ["car", "vehicle", "transportation"],
        colors: ["red", "black"],
      }
      const themeKeywords = ["animal", "pet", "furry"]

      const result = service.matchImageToTheme(detectionResults, themeKeywords)

      expect(result.isMatch).toBe(false)
      expect(result.confidence).toBe(0)
      expect(result.matchedKeywords).toHaveLength(0)
    })

    it("should handle partial matches", () => {
      const detectionResults = {
        labels: ["yellow", "flower", "garden"],
        colors: ["yellow", "green"],
      }
      const themeKeywords = ["yellow", "blue", "purple"]

      const result = service.matchImageToTheme(detectionResults, themeKeywords)

      expect(result.isMatch).toBe(true)
      expect(result.confidence).toBeCloseTo(0.33, 1) // 1 out of 3 keywords matched
      expect(result.matchedKeywords).toContain("yellow")
    })
  })
})
