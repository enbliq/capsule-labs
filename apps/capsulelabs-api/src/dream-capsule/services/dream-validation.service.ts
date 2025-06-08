import { Injectable } from "@nestjs/common"
import type { DreamLog } from "../entities/dream-log.entity"

@Injectable()
export class DreamValidationService {
  /**
   * Count words in a text string
   */
  countWords(text: string): number {
    if (!text || typeof text !== "string") return 0

    // Remove extra whitespace and split by spaces
    return text
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .filter((word) => word.length > 0).length
  }

  /**
   * Check if the current time is before the cutoff time in the specified timezone
   */
  isBeforeCutoff(cutoffTime: string, timezone = "UTC"): boolean {
    try {
      // Get current time in the specified timezone
      const now = new Date()

      // Parse cutoff time (format: "HH:MM:SS")
      const [hours, minutes, seconds] = cutoffTime.split(":").map(Number)

      // Create cutoff time for today
      const cutoff = new Date(now)
      cutoff.setHours(hours, minutes, seconds || 0, 0)

      // Compare current time with cutoff time
      return now < cutoff
    } catch (error) {
      console.error("Error checking cutoff time:", error)
      return false
    }
  }

  /**
   * Validate a dream log against requirements
   */
  validateDreamLog(
    dreamLog: DreamLog,
    minimumWordCount: number,
    cutoffTime: string,
  ): { isValid: boolean; reasons: string[] } {
    const reasons: string[] = []

    // Check word count
    if (dreamLog.wordCount < minimumWordCount) {
      reasons.push(`Dream log must be at least ${minimumWordCount} words (currently ${dreamLog.wordCount})`)
    }

    // Check if created before cutoff time
    if (!dreamLog.isBeforeCutoff) {
      reasons.push(`Dream must be logged before ${cutoffTime} (${dreamLog.timezone})`)
    }

    return {
      isValid: reasons.length === 0,
      reasons,
    }
  }
}
