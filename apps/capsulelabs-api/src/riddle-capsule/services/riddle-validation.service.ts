import { Injectable } from "@nestjs/common"
import type { Riddle } from "../entities/riddle.entity"

@Injectable()
export class RiddleValidationService {
  /**
   * Validate a user's answer against the correct riddle answer
   * Returns a similarity score between 0 and 1
   */
  validateAnswer(riddle: Riddle, userAnswer: string): { isCorrect: boolean; similarityScore: number } {
    if (!userAnswer || !riddle.answer) {
      return { isCorrect: false, similarityScore: 0 }
    }

    // Normalize both answers for comparison
    const normalizedUserAnswer = this.normalizeAnswer(userAnswer)
    const normalizedCorrectAnswer = this.normalizeAnswer(riddle.answer)

    // Check for exact match after normalization
    if (normalizedUserAnswer === normalizedCorrectAnswer) {
      return { isCorrect: true, similarityScore: 1 }
    }

    // Check for alternative answers if provided in metadata
    const alternativeAnswers = riddle.metadata?.alternativeAnswers || []
    for (const altAnswer of alternativeAnswers) {
      if (this.normalizeAnswer(altAnswer) === normalizedUserAnswer) {
        return { isCorrect: true, similarityScore: 1 }
      }
    }

    // Calculate similarity score for close matches
    const similarityScore = this.calculateSimilarity(normalizedCorrectAnswer, normalizedUserAnswer)
    const isCorrect = similarityScore >= 0.85 // 85% similarity threshold for correct answers

    return { isCorrect, similarityScore }
  }

  /**
   * Normalize an answer string for comparison
   * - Convert to lowercase
   * - Remove punctuation and special characters
   * - Remove extra whitespace
   */
  private normalizeAnswer(answer: string): string {
    return answer
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation and special characters
      .replace(/\s+/g, " ") // Replace multiple spaces with a single space
      .trim()
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * Returns a score between 0 (completely different) and 1 (identical)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1
    if (str1.length === 0) return 0
    if (str2.length === 0) return 0

    const levenshteinDistance = this.levenshteinDistance(str1, str2)
    return 1 - levenshteinDistance / Math.max(str1.length, str2.length)
  }

  /**
   * Calculate Levenshtein distance between two strings
   * This measures the minimum number of single-character edits required to change one string into the other
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }
}
