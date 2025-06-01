import { Injectable, Logger } from "@nestjs/common"
import type {
  DailyTask,
  TaskSubmission,
  TaskValidationResult,
  UserProgress,
  LoopConfig,
  MakeupTaskOpportunity,
} from "../entities/time-loop-capsule.entity"
import { TaskType, VerificationMethod } from "../entities/time-loop-capsule.entity"
import type { TaskValidationService } from "./task-validation.service"

@Injectable()
export class DailyTaskService {
  private readonly logger = new Logger(DailyTaskService.name)

  constructor(private readonly taskValidation: TaskValidationService) {}

  async validateTaskSubmission(task: DailyTask, submission: TaskSubmission): Promise<TaskValidationResult> {
    try {
      switch (task.type) {
        case TaskType.STEPS:
          return this.validateStepsTask(task, submission)
        case TaskType.QUIZ:
          return this.validateQuizTask(task, submission)
        case TaskType.GRATITUDE:
          return this.validateGratitudeTask(task, submission)
        case TaskType.HABIT_TRACKER:
          return this.validateHabitTask(task, submission)
        case TaskType.PHOTO_CHALLENGE:
          return this.validatePhotoTask(task, submission)
        case TaskType.READING:
          return this.validateReadingTask(task, submission)
        case TaskType.MEDITATION:
          return this.validateMeditationTask(task, submission)
        case TaskType.CUSTOM:
          return this.validateCustomTask(task, submission)
        default:
          return {
            isValid: false,
            score: 0,
            feedback: `Unknown task type: ${task.type}`,
            errors: [`Unsupported task type: ${task.type}`],
          }
      }
    } catch (error) {
      this.logger.error(`Error validating task ${task.id}:`, error)
      return {
        isValid: false,
        score: 0,
        feedback: "Task validation failed due to an error",
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  private validateStepsTask(task: DailyTask, submission: TaskSubmission): TaskValidationResult {
    const { targetSteps, allowManualEntry } = task.config
    const submittedSteps = submission.submissionData.steps

    if (typeof submittedSteps !== "number" || submittedSteps < 0) {
      return {
        isValid: false,
        score: 0,
        feedback: "Invalid steps data provided",
        errors: ["Steps must be a positive number"],
      }
    }

    // Check if manual entry is allowed
    if (!allowManualEntry && submission.submissionData.source === "manual") {
      return {
        isValid: false,
        score: 0,
        feedback: "Manual step entry is not allowed for this task",
        errors: ["Steps must be automatically tracked"],
      }
    }

    const targetStepsValue = targetSteps || 10000
    const completionRate = Math.min(submittedSteps / targetStepsValue, 1)
    const score = Math.round(completionRate * task.points)

    const isValid = submittedSteps >= targetStepsValue

    return {
      isValid,
      score,
      feedback: isValid
        ? `Great job! You walked ${submittedSteps} steps.`
        : `You walked ${submittedSteps} steps. Target: ${targetStepsValue} steps.`,
      metadata: {
        submittedSteps,
        targetSteps: targetStepsValue,
        completionRate: Math.round(completionRate * 100),
      },
    }
  }

  private validateQuizTask(task: DailyTask, submission: TaskSubmission): TaskValidationResult {
    const { questions, passingScore } = task.config
    const answers = submission.submissionData.answers

    if (!Array.isArray(answers) || !questions) {
      return {
        isValid: false,
        score: 0,
        feedback: "Invalid quiz submission format",
        errors: ["Answers must be provided as an array"],
      }
    }

    if (answers.length !== questions.length) {
      return {
        isValid: false,
        score: 0,
        feedback: "Number of answers doesn't match number of questions",
        errors: [`Expected ${questions.length} answers, got ${answers.length}`],
      }
    }

    let correctAnswers = 0
    const results: any[] = []

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      const userAnswer = answers[i]
      const isCorrect = userAnswer === question.correctAnswer

      if (isCorrect) {
        correctAnswers++
      }

      results.push({
        questionId: question.id,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
      })
    }

    const scorePercentage = (correctAnswers / questions.length) * 100
    const score = Math.round((scorePercentage / 100) * task.points)
    const requiredScore = passingScore || 70

    const isValid = scorePercentage >= requiredScore

    return {
      isValid,
      score,
      feedback: isValid
        ? `Excellent! You scored ${scorePercentage}%.`
        : `You scored ${scorePercentage}%. Required: ${requiredScore}%.`,
      metadata: {
        correctAnswers,
        totalQuestions: questions.length,
        scorePercentage: Math.round(scorePercentage),
        results,
      },
    }
  }

  private validateGratitudeTask(task: DailyTask, submission: TaskSubmission): TaskValidationResult {
    const { minimumCharacters, promptText } = task.config
    const gratitudeText = submission.submissionData.text

    if (typeof gratitudeText !== "string") {
      return {
        isValid: false,
        score: 0,
        feedback: "Gratitude text must be provided",
        errors: ["Text field is required"],
      }
    }

    const textLength = gratitudeText.trim().length
    const requiredLength = minimumCharacters || 50

    if (textLength < requiredLength) {
      return {
        isValid: false,
        score: 0,
        feedback: `Gratitude note is too short. Minimum ${requiredLength} characters required.`,
        errors: [`Text must be at least ${requiredLength} characters long`],
      }
    }

    // Simple quality check - avoid very repetitive text
    const words = gratitudeText.toLowerCase().split(/\s+/)
    const uniqueWords = new Set(words)
    const uniquenessRatio = uniqueWords.size / words.length

    let qualityScore = 1.0
    if (uniquenessRatio < 0.3) {
      qualityScore = 0.7 // Penalty for very repetitive text
    }

    const score = Math.round(task.points * qualityScore)

    return {
      isValid: true,
      score,
      feedback: "Thank you for sharing your gratitude!",
      metadata: {
        textLength,
        wordCount: words.length,
        uniqueWords: uniqueWords.size,
        qualityScore: Math.round(qualityScore * 100),
      },
    }
  }

  private validateHabitTask(task: DailyTask, submission: TaskSubmission): TaskValidationResult {
    const { habitName, verificationMethod } = task.config
    const submissionData = submission.submissionData

    switch (verificationMethod) {
      case VerificationMethod.SELF_REPORT:
        return this.validateSelfReportHabit(task, submissionData)
      case VerificationMethod.PHOTO_PROOF:
        return this.validatePhotoProofHabit(task, submissionData)
      case VerificationMethod.TIMER_BASED:
        return this.validateTimerBasedHabit(task, submissionData)
      case VerificationMethod.LOCATION_CHECK:
        return this.validateLocationBasedHabit(task, submissionData)
      default:
        return this.validateSelfReportHabit(task, submissionData)
    }
  }

  private validateSelfReportHabit(task: DailyTask, submissionData: any): TaskValidationResult {
    const completed = submissionData.completed

    if (typeof completed !== "boolean") {
      return {
        isValid: false,
        score: 0,
        feedback: "Please confirm if you completed the habit",
        errors: ["Completion status must be true or false"],
      }
    }

    return {
      isValid: completed,
      score: completed ? task.points : 0,
      feedback: completed ? "Habit completed successfully!" : "Habit not completed today",
      metadata: { verificationMethod: "self_report" },
    }
  }

  private validatePhotoProofHabit(task: DailyTask, submissionData: any): TaskValidationResult {
    const photoUrl = submissionData.photoUrl

    if (!photoUrl || typeof photoUrl !== "string") {
      return {
        isValid: false,
        score: 0,
        feedback: "Photo proof is required for this habit",
        errors: ["Photo URL must be provided"],
      }
    }

    // In a real implementation, you would validate the photo
    // For now, we'll assume the photo is valid
    return {
      isValid: true,
      score: task.points,
      feedback: "Photo proof accepted!",
      metadata: {
        verificationMethod: "photo_proof",
        photoUrl,
      },
    }
  }

  private validateTimerBasedHabit(task: DailyTask, submissionData: any): TaskValidationResult {
    const duration = submissionData.duration // in seconds
    const minimumDuration = task.config.minimumDuration || 300 // 5 minutes default

    if (typeof duration !== "number" || duration < 0) {
      return {
        isValid: false,
        score: 0,
        feedback: "Invalid duration provided",
        errors: ["Duration must be a positive number in seconds"],
      }
    }

    const isValid = duration >= minimumDuration
    const completionRate = Math.min(duration / minimumDuration, 1)
    const score = Math.round(completionRate * task.points)

    return {
      isValid,
      score,
      feedback: isValid
        ? `Great! You spent ${Math.round(duration / 60)} minutes on this habit.`
        : `You spent ${Math.round(duration / 60)} minutes. Minimum: ${Math.round(minimumDuration / 60)} minutes.`,
      metadata: {
        duration,
        minimumDuration,
        completionRate: Math.round(completionRate * 100),
      },
    }
  }

  private validateLocationBasedHabit(task: DailyTask, submissionData: any): TaskValidationResult {
    const { latitude, longitude } = submissionData.location || {}

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return {
        isValid: false,
        score: 0,
        feedback: "Location verification required",
        errors: ["Valid GPS coordinates must be provided"],
      }
    }

    // In a real implementation, you would check against expected locations
    // For now, we'll assume location is valid
    return {
      isValid: true,
      score: task.points,
      feedback: "Location verified successfully!",
      metadata: {
        verificationMethod: "location_check",
        location: { latitude, longitude },
      },
    }
  }

  private validatePhotoTask(task: DailyTask, submission: TaskSubmission): TaskValidationResult {
    const { requiredTags, locationRequired } = task.config
    const { photoUrl, tags, location } = submission.submissionData

    if (!photoUrl) {
      return {
        isValid: false,
        score: 0,
        feedback: "Photo is required for this challenge",
        errors: ["Photo URL must be provided"],
      }
    }

    const errors: string[] = []
    const warnings: string[] = []

    // Check required tags
    if (requiredTags && requiredTags.length > 0) {
      const submittedTags = tags || []
      const missingTags = requiredTags.filter((tag) => !submittedTags.includes(tag))

      if (missingTags.length > 0) {
        errors.push(`Missing required tags: ${missingTags.join(", ")}`)
      }
    }

    // Check location requirement
    if (locationRequired && !location) {
      errors.push("Location is required for this photo challenge")
    }

    const isValid = errors.length === 0
    const score = isValid ? task.points : 0

    return {
      isValid,
      score,
      feedback: isValid ? "Photo challenge completed!" : "Photo challenge requirements not met",
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        photoUrl,
        tags: tags || [],
        location,
      },
    }
  }

  private validateReadingTask(task: DailyTask, submission: TaskSubmission): TaskValidationResult {
    const { minimumReadTime } = task.config
    const { readTime, articleUrl } = submission.submissionData

    if (typeof readTime !== "number" || readTime < 0) {
      return {
        isValid: false,
        score: 0,
        feedback: "Invalid reading time provided",
        errors: ["Reading time must be a positive number in seconds"],
      }
    }

    const requiredTime = minimumReadTime || 300 // 5 minutes default
    const isValid = readTime >= requiredTime
    const completionRate = Math.min(readTime / requiredTime, 1)
    const score = Math.round(completionRate * task.points)

    return {
      isValid,
      score,
      feedback: isValid
        ? `Great reading! You spent ${Math.round(readTime / 60)} minutes.`
        : `You read for ${Math.round(readTime / 60)} minutes. Minimum: ${Math.round(requiredTime / 60)} minutes.`,
      metadata: {
        readTime,
        requiredTime,
        completionRate: Math.round(completionRate * 100),
        articleUrl,
      },
    }
  }

  private validateMeditationTask(task: DailyTask, submission: TaskSubmission): TaskValidationResult {
    const { minimumDuration, guidedSession } = task.config
    const { duration, sessionType } = submission.submissionData

    if (typeof duration !== "number" || duration < 0) {
      return {
        isValid: false,
        score: 0,
        feedback: "Invalid meditation duration provided",
        errors: ["Duration must be a positive number in seconds"],
      }
    }

    const requiredDuration = minimumDuration || 300 // 5 minutes default
    const isValid = duration >= requiredDuration

    // Bonus for guided sessions if preferred
    let bonusMultiplier = 1.0
    if (guidedSession && sessionType === "guided") {
      bonusMultiplier = 1.2
    }

    const completionRate = Math.min(duration / requiredDuration, 1)
    const score = Math.round(completionRate * task.points * bonusMultiplier)

    return {
      isValid,
      score,
      feedback: isValid
        ? `Peaceful meditation! You meditated for ${Math.round(duration / 60)} minutes.`
        : `You meditated for ${Math.round(duration / 60)} minutes. Minimum: ${Math.round(requiredDuration / 60)} minutes.`,
      metadata: {
        duration,
        requiredDuration,
        sessionType,
        bonusMultiplier,
        completionRate: Math.round(completionRate * 100),
      },
    }
  }

  private validateCustomTask(task: DailyTask, submission: TaskSubmission): TaskValidationResult {
    // Custom task validation would be implemented based on specific requirements
    // For now, we'll do basic validation
    const submissionData = submission.submissionData

    if (!submissionData || Object.keys(submissionData).length === 0) {
      return {
        isValid: false,
        score: 0,
        feedback: "Submission data is required for custom tasks",
        errors: ["No submission data provided"],
      }
    }

    return {
      isValid: true,
      score: task.points,
      feedback: "Custom task completed!",
      metadata: submissionData,
    }
  }

  getMakeupTaskOpportunity(
    userProgress: UserProgress,
    missedDate: Date,
    loopConfig: LoopConfig,
  ): MakeupTaskOpportunity | null {
    if (!loopConfig.allowMakeupTasks) {
      return null
    }

    // Check if the missed date is within the allowed makeup period
    const now = new Date()
    const daysSinceMissed = Math.floor((now.getTime() - missedDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSinceMissed > 7) {
      // Can't make up tasks older than 7 days
      return null
    }

    // Check if user already has too many missed days
    if (userProgress.missedDays.length >= loopConfig.maxMissedDaysBeforeReset) {
      return null
    }

    // Calculate penalty based on how long ago the task was missed
    const penaltyPoints = Math.min(daysSinceMissed * 10, 50) // 10% penalty per day, max 50%

    const deadline = new Date(now)
    deadline.setHours(23, 59, 59, 999) // End of today

    return {
      userId: userProgress.userId,
      missedDate,
      availableTasks: [], // Would be populated with available tasks
      deadline,
      penaltyPoints,
    }
  }

  getTodaysTasks(tasks: DailyTask[], taskOrder: string): DailyTask[] {
    switch (taskOrder) {
      case "sequential":
        return tasks // Return in original order
      case "random":
        return this.shuffleArray([...tasks])
      case "flexible":
      default:
        return tasks // User can choose order
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}
