import { Injectable } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import type { HttpService } from "@nestjs/axios"
import { firstValueFrom } from "rxjs"

@Injectable()
export class ObjectDetectionService {
  private readonly apiKey: string
  private readonly apiEndpoint: string
  private readonly useExternalApi: boolean

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>("VISION_API_KEY", "")
    this.apiEndpoint = this.configService.get<string>("VISION_API_ENDPOINT", "")
    this.useExternalApi = this.configService.get<boolean>("USE_EXTERNAL_VISION_API", false)
  }

  /**
   * Detect objects in an image using external API or mock implementation
   */
  async detectObjects(imageUrl: string): Promise<{
    labels: string[]
    colors: string[]
    confidence: number
    rawResponse: any
  }> {
    if (this.useExternalApi && this.apiKey && this.apiEndpoint) {
      return await this.detectObjectsWithExternalApi(imageUrl)
    } else {
      return await this.mockObjectDetection(imageUrl)
    }
  }

  /**
   * Check if an image matches a theme based on keywords
   */
  matchImageToTheme(
    detectionResults: { labels: string[]; colors: string[] },
    themeKeywords: string[],
  ): { isMatch: boolean; confidence: number; matchedKeywords: string[] } {
    const allDetectedTerms = [...detectionResults.labels, ...detectionResults.colors].map((term) => term.toLowerCase())
    const normalizedKeywords = themeKeywords.map((keyword) => keyword.toLowerCase())

    const matchedKeywords = normalizedKeywords.filter((keyword) => {
      return allDetectedTerms.some((term) => term.includes(keyword) || keyword.includes(term))
    })

    const confidence = matchedKeywords.length > 0 ? matchedKeywords.length / normalizedKeywords.length : 0
    const isMatch = confidence > 0

    return {
      isMatch,
      confidence,
      matchedKeywords,
    }
  }

  /**
   * Detect objects using an external API like Google Cloud Vision
   */
  private async detectObjectsWithExternalApi(imageUrl: string): Promise<{
    labels: string[]
    colors: string[]
    confidence: number
    rawResponse: any
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.apiEndpoint,
          {
            requests: [
              {
                image: {
                  source: {
                    imageUri: imageUrl,
                  },
                },
                features: [
                  { type: "LABEL_DETECTION", maxResults: 10 },
                  { type: "IMAGE_PROPERTIES", maxResults: 5 },
                ],
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
          },
        ),
      )

      const data = response.data
      const labels = data.responses[0]?.labelAnnotations?.map((label: any) => label.description) || []
      const colors =
        data.responses[0]?.imagePropertiesAnnotation?.dominantColors?.colors?.map((color: any) =>
          this.rgbToColorName(color.color.red, color.color.green, color.color.blue),
        ) || []

      // Calculate average confidence from label annotations
      const confidence =
        data.responses[0]?.labelAnnotations?.reduce((sum: number, label: any) => sum + label.score, 0) /
          data.responses[0]?.labelAnnotations?.length || 0

      return {
        labels,
        colors,
        confidence,
        rawResponse: data,
      }
    } catch (error) {
      console.error("Error calling external vision API:", error)
      return this.mockObjectDetection(imageUrl)
    }
  }

  /**
   * Mock object detection for development or when external API is not available
   */
  private async mockObjectDetection(imageUrl: string): Promise<{
    labels: string[]
    colors: string[]
    confidence: number
    rawResponse: any
  }> {
    // Extract potential keywords from the image URL
    const urlParts = imageUrl.toLowerCase().split(/[/.-_]/)
    const potentialKeywords = urlParts.filter(
      (part) => part.length > 3 && !part.match(/^(http|https|www|com|jpg|png|jpeg)$/),
    )

    // Generate mock labels based on URL parts or use generic labels
    const mockLabels = potentialKeywords.length > 0 ? potentialKeywords.slice(0, 5) : ["object", "photo", "image"]

    // Generate mock colors
    const mockColors = ["blue", "red", "green", "yellow", "white"]
    const selectedColors = mockColors.slice(0, Math.floor(Math.random() * 3) + 1)

    return {
      labels: mockLabels,
      colors: selectedColors,
      confidence: 0.7 + Math.random() * 0.3, // Random confidence between 0.7 and 1.0
      rawResponse: {
        mock: true,
        imageUrl,
        labels: mockLabels,
        colors: selectedColors,
      },
    }
  }

  /**
   * Convert RGB values to color name
   */
  private rgbToColorName(r: number, g: number, b: number): string {
    // Simple color naming logic
    const colors = [
      { name: "red", r: 255, g: 0, b: 0 },
      { name: "green", r: 0, g: 255, b: 0 },
      { name: "blue", r: 0, g: 0, b: 255 },
      { name: "yellow", r: 255, g: 255, b: 0 },
      { name: "cyan", r: 0, g: 255, b: 255 },
      { name: "magenta", r: 255, g: 0, b: 255 },
      { name: "white", r: 255, g: 255, b: 255 },
      { name: "black", r: 0, g: 0, b: 0 },
      { name: "orange", r: 255, g: 165, b: 0 },
      { name: "purple", r: 128, g: 0, b: 128 },
      { name: "brown", r: 165, g: 42, b: 42 },
      { name: "pink", r: 255, g: 192, b: 203 },
      { name: "gray", r: 128, g: 128, b: 128 },
    ]

    // Find the closest color by Euclidean distance
    let minDistance = Number.POSITIVE_INFINITY
    let closestColor = "unknown"

    for (const color of colors) {
      const distance = Math.sqrt(Math.pow(r - color.r, 2) + Math.pow(g - color.g, 2) + Math.pow(b - color.b, 2))
      if (distance < minDistance) {
        minDistance = distance
        closestColor = color.name
      }
    }

    return closestColor
  }
}
