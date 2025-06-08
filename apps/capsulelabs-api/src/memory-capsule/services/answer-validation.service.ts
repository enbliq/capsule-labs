import { Injectable } from "@nestjs/common"
import { type MemoryQuestion, QuestionType } from "../entities/memory-question.entity"

@Injectable()
export class AnswerValidationService {
  validateAnswer(question: MemoryQuestion, userAnswer: Record<string, any>): boolean {
    switch (question.type) {
      case QuestionType.MOOD:
        return this.validateMoodAnswer(question, userAnswer)
      case QuestionType.CAPSULE_INTERACTION:
        return this.validateCapsuleInteractionAnswer(question, userAnswer)
      case QuestionType.DAILY_ACTIVITY:
        return this.validateDailyActivityAnswer(question, userAnswer)
      case QuestionType.TIMESTAMP:
        return this.validateTimestampAnswer(question, userAnswer)
      default:
        return false
    }
  }

  private validateMoodAnswer(question: MemoryQuestion, userAnswer: Record<string, any>): boolean {
    const correctMood = question.correctAnswer.mood
    const userMood = userAnswer.mood

    return correctMood === userMood
  }

  private validateCapsuleInteractionAnswer(question: MemoryQuestion, userAnswer: Record<string, any>): boolean {
    const correctTitle = question.correctAnswer.capsuleTitle?.toLowerCase().trim()
    const userTitle = userAnswer.capsuleTitle?.toLowerCase().trim()

    if (correctTitle && userTitle) {
      // Allow partial matches for capsule titles
      return correctTitle.includes(userTitle) || userTitle.includes(correctTitle)
    }

    // Also check by ID if provided
    if (question.correctAnswer.capsuleId && userAnswer.capsuleId) {
      return question.correctAnswer.capsuleId === userAnswer.capsuleId
    }

    return false
  }

  private validateDailyActivityAnswer(question: MemoryQuestion, userAnswer: Record<string, any>): boolean {
    const correctActivities = question.correctAnswer.activities || []
    const userActivities = userAnswer.activities || []

    if (correctActivities.length === 0) return false

    // Check if at least 50% of activities match
    const matchingActivities = userActivities.filter((activity) =>
      correctActivities.some(
        (correct) =>
          correct.toLowerCase().includes(activity.toLowerCase()) ||
          activity.toLowerCase().includes(correct.toLowerCase()),
      ),
    )

    return matchingActivities.length >= Math.ceil(correctActivities.length * 0.5)
  }

  private validateTimestampAnswer(question: MemoryQuestion, userAnswer: Record<string, any>): boolean {
    const correctDayOfWeek = question.correctAnswer.dayOfWeek?.toLowerCase()
    const userDayOfWeek = userAnswer.dayOfWeek?.toLowerCase()

    return correctDayOfWeek === userDayOfWeek
  }

  calculateSimilarity(correct: string, user: string): number {
    if (!correct || !user) return 0

    const correctLower = correct.toLowerCase().trim()
    const userLower = user.toLowerCase().trim()

    if (correctLower === userLower) return 1

    // Simple similarity calculation
    const longer = correctLower.length > userLower.length ? correctLower : userLower
    const shorter = correctLower.length > userLower.length ? userLower : correctLower

    if (longer.length === 0) return 1

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        }
      }
    }

    return matrix[str2.length][str1.length]
  }
}
