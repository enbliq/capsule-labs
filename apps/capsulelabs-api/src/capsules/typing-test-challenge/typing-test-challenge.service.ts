import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { v4 as uuidv4 } from "uuid"
import type {
  CreateTypingTestDto,
  StartTypingTestDto,
  SubmitTypingTestDto,
  TypingTestSessionDto,
  TypingTestResultDto,
  TypingTestStatisticsDto,
} from "./dto/typing-test-challenge.dto"

export interface TypingTestSession {
  sessionId: string
  userId: string
  text: string
  startTime?: Date
  endTime?: Date
  status: "created" | "started" | "completed" | "failed" | "expired"
  userInput?: string
  wpm?: number
  accuracy?: number
  errors?: number
  correctChars?: number
  totalChars?: number
  timeElapsed?: number
  createdAt: Date
  expiresAt: Date
  settings: {
    duration: number
    minWpm: number
    minAccuracy: number
    difficulty: "easy" | "medium" | "hard"
    includeNumbers: boolean
    includePunctuation: boolean
    includeCapitals: boolean
  }
}

export interface TypingTestResult {
  sessionId: string
  userId: string
  success: boolean
  wpm: number
  accuracy: number
  errors: number
  correctChars: number
  totalChars: number
  timeElapsed: number
  completedAt: Date
}

@Injectable()
export class TypingTestChallengeService {
  private readonly logger = new Logger(TypingTestChallengeService.name)
  private readonly sessions = new Map<string, TypingTestSession>()
  private readonly results = new Map<string, TypingTestResult[]>()

  // Predefined typing test texts by difficulty
  private readonly typingTexts = {
    easy: [
      "The quick brown fox jumps over the lazy dog near the old oak tree.",
      "A simple sentence with common words that are easy to type quickly.",
      "Practice makes perfect when learning to type faster and more accurately.",
      "The sun shines bright on a beautiful day in the peaceful countryside.",
      "Reading books helps improve vocabulary and typing skills over time.",
    ],
    medium: [
      "Technology has revolutionized the way we communicate and work in modern society.",
      "Artificial intelligence and machine learning are transforming various industries worldwide.",
      "Climate change requires immediate action from governments and individuals alike.",
      "The internet has connected people across continents and created new opportunities.",
      "Education systems must adapt to prepare students for the digital economy.",
    ],
    hard: [
      "Quantum computing represents a paradigm shift in computational capabilities, potentially solving complex problems exponentially faster than classical computers.",
      "Cryptocurrency and blockchain technology have disrupted traditional financial systems, creating decentralized alternatives to conventional banking.",
      "Biotechnology advances in CRISPR gene editing offer unprecedented opportunities for treating genetic disorders and enhancing human capabilities.",
      "The intersection of neuroscience and artificial intelligence promises to unlock mysteries of consciousness and cognitive enhancement.",
      "Sustainable development requires balancing economic growth with environmental conservation and social equity considerations.",
    ],
  }

  constructor(private configService: ConfigService) {
    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000)
  }

  async createTypingTest(createDto: CreateTypingTestDto): Promise<TypingTestSessionDto> {
    const sessionId = uuidv4()
    const duration = createDto.duration || this.configService.get<number>("TYPING_TEST_DURATION", 30000)
    const minWpm = createDto.minWpm || this.configService.get<number>("TYPING_TEST_MIN_WPM", 40)
    const minAccuracy = createDto.minAccuracy || this.configService.get<number>("TYPING_TEST_MIN_ACCURACY", 90)
    const difficulty = createDto.difficulty || "medium"

    const expiryTime = this.configService.get<number>("TYPING_TEST_SESSION_EXPIRY", 300000)
    const expiresAt = new Date(Date.now() + expiryTime)

    // Select random text based on difficulty
    const texts = this.typingTexts[difficulty]
    const selectedText = texts[Math.floor(Math.random() * texts.length)]

    // Modify text based on settings
    let finalText = selectedText
    if (!createDto.includeCapitals) {
      finalText = finalText.toLowerCase()
    }
    if (!createDto.includePunctuation) {
      finalText = finalText.replace(/[^\w\s]/g, "")
    }
    if (createDto.includeNumbers) {
      // Add some numbers to the text
      const numbers = " 123 456 789 "
      finalText += numbers
    }

    const session: TypingTestSession = {
      sessionId,
      userId: createDto.userId,
      text: finalText.trim(),
      status: "created",
      createdAt: new Date(),
      expiresAt,
      settings: {
        duration,
        minWpm,
        minAccuracy,
        difficulty,
        includeNumbers: createDto.includeNumbers || false,
        includePunctuation: createDto.includePunctuation !== false,
        includeCapitals: createDto.includeCapitals !== false,
      },
    }

    this.sessions.set(sessionId, session)

    this.logger.log(`Created typing test session ${sessionId} for user ${createDto.userId}`)

    return {
      sessionId,
      text: finalText.trim(),
      duration,
      minWpm,
      minAccuracy,
      difficulty,
      expiresAt,
      status: "created",
    }
  }

  async startTypingTest(
    sessionId: string,
    startDto: StartTypingTestDto,
  ): Promise<{ success: boolean; startTime: Date }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new NotFoundException("Typing test session not found")
    }

    if (session.userId !== startDto.userId) {
      throw new BadRequestException("Session does not belong to this user")
    }

    if (session.status !== "created") {
      throw new BadRequestException(`Cannot start session in ${session.status} state`)
    }

    if (new Date() > session.expiresAt) {
      session.status = "expired"
      throw new BadRequestException("Session has expired")
    }

    session.status = "started"
    session.startTime = new Date()

    this.logger.log(`Started typing test session ${sessionId} for user ${startDto.userId}`)

    // Auto-fail session after duration + grace period
    setTimeout(() => {
      const currentSession = this.sessions.get(sessionId)
      if (currentSession && currentSession.status === "started") {
        currentSession.status = "failed"
        this.logger.log(`Auto-failed typing test session ${sessionId} due to timeout`)
      }
    }, session.settings.duration + 5000) // 5 second grace period

    return {
      success: true,
      startTime: session.startTime,
    }
  }

  async submitTypingTest(sessionId: string, submitDto: SubmitTypingTestDto): Promise<TypingTestResultDto> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new NotFoundException("Typing test session not found")
    }

    if (session.userId !== submitDto.userId) {
      throw new BadRequestException("Session does not belong to this user")
    }

    if (session.status !== "started") {
      throw new BadRequestException(`Cannot submit session in ${session.status} state`)
    }

    if (!session.startTime) {
      throw new BadRequestException("Session was not properly started")
    }

    const endTime = new Date()
    const timeElapsed = endTime.getTime() - session.startTime.getTime()

    // Validate timing
    if (timeElapsed < session.settings.duration * 0.8) {
      throw new BadRequestException("Test completed too quickly")
    }

    // Calculate typing metrics
    const metrics = this.calculateTypingMetrics(session.text, submitDto.userInput, timeElapsed)

    session.endTime = endTime
    session.userInput = submitDto.userInput
    session.wpm = metrics.wpm
    session.accuracy = metrics.accuracy
    session.errors = metrics.errors
    session.correctChars = metrics.correctChars
    session.totalChars = metrics.totalChars
    session.timeElapsed = timeElapsed

    // Determine if challenge passed
    const passed = metrics.wpm >= session.settings.minWpm && metrics.accuracy >= session.settings.minAccuracy

    session.status = passed ? "completed" : "failed"

    // Store result
    const result: TypingTestResult = {
      sessionId,
      userId: session.userId,
      success: passed,
      wpm: metrics.wpm,
      accuracy: metrics.accuracy,
      errors: metrics.errors,
      correctChars: metrics.correctChars,
      totalChars: metrics.totalChars,
      timeElapsed,
      completedAt: endTime,
    }

    if (!this.results.has(session.userId)) {
      this.results.set(session.userId, [])
    }
    this.results.get(session.userId)!.push(result)

    this.logger.log(
      `Typing test ${sessionId} ${passed ? "completed" : "failed"} - WPM: ${metrics.wpm}, Accuracy: ${metrics.accuracy}%`,
    )

    return {
      sessionId,
      success: passed,
      wpm: metrics.wpm,
      accuracy: metrics.accuracy,
      errors: metrics.errors,
      correctChars: metrics.correctChars,
      totalChars: metrics.totalChars,
      timeElapsed,
      requiredWpm: session.settings.minWpm,
      requiredAccuracy: session.settings.minAccuracy,
      completedAt: endTime,
    }
  }

  async getSessionStatus(sessionId: string): Promise<TypingTestSessionDto> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new NotFoundException("Typing test session not found")
    }

    return {
      sessionId: session.sessionId,
      text: session.text,
      duration: session.settings.duration,
      minWpm: session.settings.minWpm,
      minAccuracy: session.settings.minAccuracy,
      difficulty: session.settings.difficulty,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      wpm: session.wpm,
      accuracy: session.accuracy,
      errors: session.errors,
      timeElapsed: session.timeElapsed,
      expiresAt: session.expiresAt,
    }
  }

  async getUserSessions(userId: string): Promise<TypingTestResult[]> {
    return this.results.get(userId) || []
  }

  async getUserStatistics(userId: string): Promise<TypingTestStatisticsDto> {
    const userResults = this.results.get(userId) || []

    if (userResults.length === 0) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        failedSessions: 0,
        successRate: 0,
        averageWpm: 0,
        bestWpm: 0,
        averageAccuracy: 0,
        bestAccuracy: 0,
        totalTypingTime: 0,
        currentStreak: 0,
        bestStreak: 0,
      }
    }

    const completed = userResults.filter((r) => r.success)
    const failed = userResults.filter((r) => !r.success)

    const averageWpm = userResults.reduce((sum, r) => sum + r.wpm, 0) / userResults.length
    const bestWpm = Math.max(...userResults.map((r) => r.wpm))
    const averageAccuracy = userResults.reduce((sum, r) => sum + r.accuracy, 0) / userResults.length
    const bestAccuracy = Math.max(...userResults.map((r) => r.accuracy))
    const totalTypingTime = userResults.reduce((sum, r) => sum + r.timeElapsed, 0)

    // Calculate streaks
    let currentStreak = 0
    let bestStreak = 0
    let tempStreak = 0

    for (let i = userResults.length - 1; i >= 0; i--) {
      if (userResults[i].success) {
        tempStreak++
        if (i === userResults.length - 1) {
          currentStreak = tempStreak
        }
      } else {
        bestStreak = Math.max(bestStreak, tempStreak)
        tempStreak = 0
        if (i === userResults.length - 1) {
          currentStreak = 0
        }
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak)

    return {
      totalSessions: userResults.length,
      completedSessions: completed.length,
      failedSessions: failed.length,
      successRate: (completed.length / userResults.length) * 100,
      averageWpm: Math.round(averageWpm * 100) / 100,
      bestWpm: Math.round(bestWpm * 100) / 100,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      bestAccuracy: Math.round(bestAccuracy * 100) / 100,
      totalTypingTime,
      currentStreak,
      bestStreak,
    }
  }

  private calculateTypingMetrics(originalText: string, userInput: string, timeElapsed: number) {
    const originalChars = originalText.split("")
    const userChars = userInput.split("")

    let correctChars = 0
    let errors = 0

    // Compare character by character
    const maxLength = Math.max(originalChars.length, userChars.length)

    for (let i = 0; i < maxLength; i++) {
      const originalChar = originalChars[i] || ""
      const userChar = userChars[i] || ""

      if (originalChar === userChar) {
        correctChars++
      } else {
        errors++
      }
    }

    const totalChars = userInput.length
    const accuracy = totalChars > 0 ? (correctChars / Math.max(originalText.length, totalChars)) * 100 : 0

    // Calculate WPM (Words Per Minute)
    // Standard: 5 characters = 1 word
    const wordsTyped = correctChars / 5
    const timeInMinutes = timeElapsed / (1000 * 60)
    const wpm = timeInMinutes > 0 ? wordsTyped / timeInMinutes : 0

    return {
      wpm: Math.round(wpm * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      errors,
      correctChars,
      totalChars,
    }
  }

  private cleanupExpiredSessions(): void {
    const now = new Date()
    let cleanedCount = 0

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt && session.status !== "completed") {
        session.status = "expired"
        this.sessions.delete(sessionId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired typing test sessions`)
    }
  }
}
