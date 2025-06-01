import { Injectable, Logger } from "@nestjs/common"

@Injectable()
export class TaskValidationService {
  private readonly logger = new Logger(TaskValidationService.name)

  validateStepsData(steps: number, source: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (typeof steps !== "number" || isNaN(steps)) {
      errors.push("Steps must be a valid number")
    }

    if (steps < 0) {
      errors.push("Steps cannot be negative")
    }

    if (steps > 100000) {
      errors.push("Steps value seems unrealistic (over 100,000)")
    }

    // Validate data source
    const validSources = ["fitness_tracker", "smartphone", "manual", "smartwatch"]
    if (source && !validSources.includes(source)) {
      errors.push(`Invalid data source: ${source}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  validateQuizAnswers(answers: number[], questions: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!Array.isArray(answers)) {
      errors.push("Answers must be provided as an array")
      return { isValid: false, errors }
    }

    if (answers.length !== questions.length) {
      errors.push(`Expected ${questions.length} answers, received ${answers.length}`)
    }

    answers.forEach((answer, index) => {
      if (typeof answer !== "number" || answer < 0) {
        errors.push(`Answer ${index + 1} must be a valid option number`)
      }

      const question = questions[index]
      if (question && answer >= question.options.length) {
        errors.push(`Answer ${index + 1} is out of range for available options`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  validateGratitudeText(text: string, minLength: number): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    if (typeof text !== "string") {
      errors.push("Gratitude text must be a string")
      return { isValid: false, errors, warnings }
    }

    const trimmedText = text.trim()

    if (trimmedText.length === 0) {
      errors.push("Gratitude text cannot be empty")
    }

    if (trimmedText.length < minLength) {
      errors.push(`Gratitude text must be at least ${minLength} characters long`)
    }

    // Check for common spam patterns
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /^(test|testing|asdf|qwerty|123)+$/i, // Common test strings
    ]

    spamPatterns.forEach((pattern) => {
      if (pattern.test(trimmedText)) {
        warnings.push("Text appears to be low quality or spam")
      }
    })

    // Check for very short words (might indicate low effort)
    const words = trimmedText.split(/\s+/)
    const shortWords = words.filter((word) => word.length <= 2)
    if (shortWords.length / words.length > 0.5) {
      warnings.push("Consider using more descriptive words")
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  validatePhotoSubmission(photoData: any): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!photoData.photoUrl) {
      errors.push("Photo URL is required")
    }

    if (photoData.photoUrl && typeof photoData.photoUrl !== "string") {
      errors.push("Photo URL must be a string")
    }

    // Validate URL format
    if (photoData.photoUrl) {
      try {
        new URL(photoData.photoUrl)
      } catch {
        errors.push("Invalid photo URL format")
      }
    }

    // Check file extension
    if (photoData.photoUrl) {
      const validExtensions = [".jpg", ".jpeg", ".png", ".webp"]
      const hasValidExtension = validExtensions.some((ext) => photoData.photoUrl.toLowerCase().endsWith(ext))

      if (!hasValidExtension) {
        warnings.push("Photo should be in JPG, PNG, or WebP format")
      }
    }

    // Validate tags if provided
    if (photoData.tags && !Array.isArray(photoData.tags)) {
      errors.push("Tags must be provided as an array")
    }

    if (photoData.tags) {
      photoData.tags.forEach((tag: any, index: number) => {
        if (typeof tag !== "string") {
          errors.push(`Tag ${index + 1} must be a string`)
        }
      })
    }

    // Validate location if provided
    if (photoData.location) {
      const { latitude, longitude } = photoData.location

      if (typeof latitude !== "number" || latitude < -90 || latitude > 90) {
        errors.push("Invalid latitude value")
      }

      if (typeof longitude !== "number" || longitude < -180 || longitude > 180) {
        errors.push("Invalid longitude value")
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  validateDurationData(duration: number, minimumDuration: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (typeof duration !== "number" || isNaN(duration)) {
      errors.push("Duration must be a valid number")
    }

    if (duration < 0) {
      errors.push("Duration cannot be negative")
    }

    if (duration > 86400) {
      // More than 24 hours
      errors.push("Duration cannot exceed 24 hours")
    }

    if (duration < minimumDuration) {
      errors.push(`Duration must be at least ${minimumDuration} seconds`)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}
