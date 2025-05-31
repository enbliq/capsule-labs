import { Injectable } from "@nestjs/common"
import * as crypto from "crypto"

interface VoiceRecognitionResult {
  recognizedText: string
  confidenceScore: number
}

interface VoiceMatchResult {
  isMatch: boolean
  matchScore: number
}

@Injectable()
export class VoiceRecognitionService {
  /**
   * Generates a hash of the voice sample that can be used for comparison
   * In a real implementation, this would use a voice biometric SDK
   */
  generateVoicePrintHash(voiceSample: string): string {
    // In a real implementation, this would extract voice features and create a biometric template
    // For this mock, we'll just create a hash of the audio data
    return crypto.createHash("sha256").update(voiceSample).digest("hex")
  }

  /**
   * Recognizes speech from a voice sample
   * In a real implementation, this would use a speech-to-text service
   */
  recognizeSpeech(voiceSample: string): VoiceRecognitionResult {
    // Mock implementation - in reality, this would use a speech recognition API
    // For demo purposes, we'll extract a "text" field from the base64 string if it exists
    // Format expected: base64;text=hello world
    let recognizedText = ""
    let confidenceScore = 0

    try {
      if (voiceSample.includes(";text=")) {
        recognizedText = voiceSample.split(";text=")[1]
        // Generate a confidence score based on the length of the text
        // This is just for demonstration purposes
        confidenceScore = Math.min(0.5 + recognizedText.length / 20, 0.95)
      } else {
        // If no text is provided, generate a random confidence score
        confidenceScore = Math.random() * 0.5 // Low confidence
      }
    } catch (error) {
      console.error("Error recognizing speech:", error)
      confidenceScore = 0.1 // Very low confidence
    }

    return {
      recognizedText,
      confidenceScore,
    }
  }

  /**
   * Compares a voice sample to a stored voice print
   * In a real implementation, this would use a voice biometric SDK
   */
  compareVoicePrint(voiceSample: string, storedVoicePrintHash: string): VoiceMatchResult {
    // Mock implementation - in reality, this would use voice biometric comparison
    const sampleHash = this.generateVoicePrintHash(voiceSample)

    // Calculate a similarity score based on the hash similarity
    // This is just for demonstration purposes
    let matchScore = 0
    let matchCount = 0

    // Compare the first 20 characters of the hash
    for (let i = 0; i < 20; i++) {
      if (sampleHash[i] === storedVoicePrintHash[i]) {
        matchCount++
      }
    }

    matchScore = matchCount / 20

    // If the voice sample contains a special marker for testing, override the score
    // Format: base64;match=0.85
    if (voiceSample.includes(";match=")) {
      try {
        const matchValue = Number.parseFloat(voiceSample.split(";match=")[1])
        if (!isNaN(matchValue) && matchValue >= 0 && matchValue <= 1) {
          matchScore = matchValue
        }
      } catch (error) {
        console.error("Error parsing match score:", error)
      }
    }

    return {
      isMatch: matchScore >= 0.7, // Default threshold
      matchScore,
    }
  }

  /**
   * Compares two phrases for similarity
   */
  comparePhrases(phrase1: string, phrase2: string, caseSensitive = false): number {
    if (!caseSensitive) {
      phrase1 = phrase1.toLowerCase()
      phrase2 = phrase2.toLowerCase()
    }

    // Exact match
    if (phrase1 === phrase2) {
      return 1.0
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(phrase1, phrase2)
    const maxLength = Math.max(phrase1.length, phrase2.length)

    // Convert distance to similarity score (1.0 = identical, 0.0 = completely different)
    return Math.max(0, 1 - distance / maxLength)
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length
    const n = str2.length
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) {
      dp[i][0] = i
    }

    for (let j = 0; j <= n; j++) {
      dp[0][j] = j
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j - 1] + 1, // substitution
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j] + 1, // deletion
          )
        }
      }
    }

    return dp[m][n]
  }
}
