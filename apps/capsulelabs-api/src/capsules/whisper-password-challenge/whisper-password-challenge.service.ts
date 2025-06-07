import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { v4 as uuidv4 } from "uuid"

export interface AudioAnalysis {
  averageDecibel: number
  peakDecibel: number
  duration: number
  frequency: number
  isWhisperLevel: boolean
  noiseFloor: number
  speechDetected: boolean
}

export interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  alternatives?: Array<{
    transcript: string
    confidence: number
  }>
  language: string
  isFinal: boolean
}

export interface WhisperAttempt {
  attemptId: string
  timestamp: number
  audioAnalysis: AudioAnalysis
  speechResult?: SpeechRecognitionResult
  passwordMatch: boolean
  volumeValid: boolean
  success: boolean
  failureReason?: string
}

export interface WhisperSession {
  sessionId: string
  userId: string
  password: string
  passwordHint?: string
  createdAt: number
  expiresAt: number
  status: "active" | "completed" | "failed" | "expired"
  attempts: WhisperAttempt[]
  maxAttempts: number
  remainingAttempts: number
  settings: {
    maxDecibelLevel: number
    minDecibelLevel: number
    minConfidence: number
    maxDuration: number
    minDuration: number
    allowedLanguages: string[]
    requireExactMatch: boolean
    caseSensitive: boolean
    allowPartialMatch: boolean
    partialMatchThreshold: number
  }
  completedAt?: number
  unlocked: boolean
  statistics: {
    totalAttempts: number
    averageDecibel: number
    averageConfidence: number
    bestAttempt?: WhisperAttempt
  }
}

export interface WhisperSessionSummary {
  sessionId: string
  userId: string
  status: string
  createdAt: number
  completedAt?: number
  attempts: number
  success: boolean
  averageDecibel: number
  bestConfidence: number
}

@Injectable()
export class WhisperPasswordChallengeService {
  private sessions = new Map<string, WhisperSession>()
  private userSessions = new Map<string, string[]>()

  private readonly defaultMaxDecibel: number
  private readonly defaultMinDecibel: number
  private readonly defaultMinConfidence: number
  private readonly defaultMaxAttempts: number
  private readonly defaultSessionExpiry: number
  private readonly defaultMaxDuration: number
  private readonly defaultMinDuration: number

  constructor(private readonly configService: ConfigService) {
    this.defaultMaxDecibel = this.configService.get<number>("WHISPER_MAX_DECIBEL", -20)
    this.defaultMinDecibel = this.configService.get<number>("WHISPER_MIN_DECIBEL", -60)
    this.defaultMinConfidence = this.configService.get<number>("WHISPER_MIN_CONFIDENCE", 0.7)
    this.defaultMaxAttempts = this.configService.get<number>("WHISPER_MAX_ATTEMPTS", 5)
    this.defaultSessionExpiry = this.configService.get<number>("WHISPER_SESSION_EXPIRY", 300000) // 5 minutes
    this.defaultMaxDuration = this.configService.get<number>("WHISPER_MAX_DURATION", 10000) // 10 seconds
    this.defaultMinDuration = this.configService.get<number>("WHISPER_MIN_DURATION", 1000) // 1 second

    // Cleanup expired sessions every minute
    setInterval(() => this.cleanupExpiredSessions(), 60000)
  }

  async createSession(
    userId: string,
    password: string,
    options: {
      passwordHint?: string
      maxDecibelLevel?: number
      minDecibelLevel?: number
      minConfidence?: number
      maxAttempts?: number
      sessionExpiry?: number
      maxDuration?: number
      minDuration?: number
      allowedLanguages?: string[]
      requireExactMatch?: boolean
      caseSensitive?: boolean
      allowPartialMatch?: boolean
      partialMatchThreshold?: number
    } = {},
  ): Promise<WhisperSession> {
    if (!password || password.trim().length === 0) {
      throw new BadRequestException("Password cannot be empty")
    }

    if (password.length > 100) {
      throw new BadRequestException("Password too long (max 100 characters)")
    }

    const sessionId = uuidv4()
    const now = Date.now()
    const expiresAt = now + (options.sessionExpiry || this.defaultSessionExpiry)

    const session: WhisperSession = {
      sessionId,
      userId,
      password: options.caseSensitive !== false ? password : password.toLowerCase(),
      passwordHint: options.passwordHint,
      createdAt: now,
      expiresAt,
      status: "active",
      attempts: [],
      maxAttempts: options.maxAttempts || this.defaultMaxAttempts,
      remainingAttempts: options.maxAttempts || this.defaultMaxAttempts,
      settings: {
        maxDecibelLevel: options.maxDecibelLevel || this.defaultMaxDecibel,
        minDecibelLevel: options.minDecibelLevel || this.defaultMinDecibel,
        minConfidence: options.minConfidence || this.defaultMinConfidence,
        maxDuration: options.maxDuration || this.defaultMaxDuration,
        minDuration: options.minDuration || this.defaultMinDuration,
        allowedLanguages: options.allowedLanguages || ["en-US", "en-GB"],
        requireExactMatch: options.requireExactMatch !== false,
        caseSensitive: options.caseSensitive !== false,
        allowPartialMatch: options.allowPartialMatch || false,
        partialMatchThreshold: options.partialMatchThreshold || 0.8,
      },
      unlocked: false,
      statistics: {
        totalAttempts: 0,
        averageDecibel: 0,
        averageConfidence: 0,
      },
    }

    this.sessions.set(sessionId, session)

    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, [])
    }
    this.userSessions.get(userId)!.push(sessionId)

    console.log(`Whisper password session created: ${sessionId} for user: ${userId}`)
    return session
  }

  async processWhisperAttempt(
    sessionId: string,
    audioAnalysis: AudioAnalysis,
    speechResult: SpeechRecognitionResult,
  ): Promise<{
    success: boolean
    session: WhisperSession
    attempt: WhisperAttempt
    message: string
    unlocked: boolean
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new NotFoundException("Session not found")
    }

    if (session.status !== "active") {
      throw new BadRequestException(`Session is ${session.status}`)
    }

    if (Date.now() > session.expiresAt) {
      session.status = "expired"
      throw new BadRequestException("Session has expired")
    }

    if (session.remainingAttempts <= 0) {
      session.status = "failed"
      throw new BadRequestException("No attempts remaining")
    }

    // Validate audio analysis
    this.validateAudioAnalysis(audioAnalysis, session.settings)

    // Validate speech recognition result
    this.validateSpeechResult(speechResult, session.settings)

    const attemptId = uuidv4()
    const now = Date.now()

    // Check if volume is within whisper range
    const volumeValid = this.isWhisperLevel(audioAnalysis, session.settings)

    // Check if password matches
    const passwordMatch = this.checkPasswordMatch(speechResult.transcript, session.password, session.settings)

    // Determine success
    const success = volumeValid && passwordMatch && speechResult.confidence >= session.settings.minConfidence

    const attempt: WhisperAttempt = {
      attemptId,
      timestamp: now,
      audioAnalysis,
      speechResult,
      passwordMatch,
      volumeValid,
      success,
      failureReason: this.getFailureReason(volumeValid, passwordMatch, speechResult, session.settings),
    }

    // Add attempt to session
    session.attempts.push(attempt)
    session.remainingAttempts--
    session.statistics.totalAttempts++

    // Update statistics
    this.updateSessionStatistics(session, attempt)

    let message = ""
    let unlocked = false

    if (success) {
      session.status = "completed"
      session.completedAt = now
      session.unlocked = true
      unlocked = true
      message = "Whisper password challenge completed successfully! Capsule unlocked."
      console.log(`Whisper challenge completed successfully: ${sessionId}`)
    } else {
      if (session.remainingAttempts <= 0) {
        session.status = "failed"
        message = "Challenge failed. No attempts remaining."
        console.log(`Whisper challenge failed: ${sessionId} - no attempts remaining`)
      } else {
        message = `Attempt failed: ${attempt.failureReason}. ${session.remainingAttempts} attempts remaining.`
        console.log(`Whisper attempt failed: ${sessionId} - ${attempt.failureReason}`)
      }
    }

    return {
      success,
      session,
      attempt,
      message,
      unlocked,
    }
  }

  async getSession(sessionId: string): Promise<WhisperSession | null> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    // Check if expired
    if (Date.now() > session.expiresAt && session.status === "active") {
      session.status = "expired"
    }

    return session
  }

  async getUserSessions(userId: string): Promise<WhisperSessionSummary[]> {
    const sessionIds = this.userSessions.get(userId) || []
    const summaries: WhisperSessionSummary[] = []

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId)
      if (session) {
        summaries.push({
          sessionId: session.sessionId,
          userId: session.userId,
          status: session.status,
          createdAt: session.createdAt,
          completedAt: session.completedAt,
          attempts: session.attempts.length,
          success: session.unlocked,
          averageDecibel: session.statistics.averageDecibel,
          bestConfidence: Math.max(...session.attempts.map((a) => a.speechResult?.confidence || 0)),
        })
      }
    }

    return summaries.sort((a, b) => b.createdAt - a.createdAt)
  }

  async getUserStatistics(userId: string): Promise<{
    totalSessions: number
    completedSessions: number
    failedSessions: number
    successRate: number
    totalAttempts: number
    averageAttemptsPerSession: number
    averageDecibel: number
    averageConfidence: number
    bestSession?: WhisperSessionSummary
    currentStreak: number
  }> {
    const sessions = await this.getUserSessions(userId)

    const totalSessions = sessions.length
    const completedSessions = sessions.filter((s) => s.success).length
    const failedSessions = sessions.filter((s) => s.status === "failed").length
    const successRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0

    const totalAttempts = sessions.reduce((sum, s) => sum + s.attempts, 0)
    const averageAttemptsPerSession = totalSessions > 0 ? totalAttempts / totalSessions : 0

    const averageDecibel =
      sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.averageDecibel, 0) / sessions.length : 0

    const averageConfidence =
      sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.bestConfidence, 0) / sessions.length : 0

    const bestSession = sessions.filter((s) => s.success).sort((a, b) => b.bestConfidence - a.bestConfidence)[0]

    // Calculate current streak
    let currentStreak = 0
    for (const session of sessions) {
      if (session.success) {
        currentStreak++
      } else {
        break
      }
    }

    return {
      totalSessions,
      completedSessions,
      failedSessions,
      successRate,
      totalAttempts,
      averageAttemptsPerSession,
      averageDecibel,
      averageConfidence,
      bestSession,
      currentStreak,
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new NotFoundException("Session not found")
    }

    if (session.status === "active") {
      session.status = "failed"
    }

    console.log(`Whisper session ended: ${sessionId}`)
  }

  private validateAudioAnalysis(audioAnalysis: AudioAnalysis, settings: any): void {
    if (!audioAnalysis) {
      throw new BadRequestException("Audio analysis is required")
    }

    if (
      typeof audioAnalysis.averageDecibel !== "number" ||
      typeof audioAnalysis.peakDecibel !== "number" ||
      typeof audioAnalysis.duration !== "number"
    ) {
      throw new BadRequestException("Invalid audio analysis data")
    }

    if (audioAnalysis.duration < settings.minDuration) {
      throw new BadRequestException(`Audio too short (minimum ${settings.minDuration}ms)`)
    }

    if (audioAnalysis.duration > settings.maxDuration) {
      throw new BadRequestException(`Audio too long (maximum ${settings.maxDuration}ms)`)
    }

    if (!audioAnalysis.speechDetected) {
      throw new BadRequestException("No speech detected in audio")
    }
  }

  private validateSpeechResult(speechResult: SpeechRecognitionResult, settings: any): void {
    if (!speechResult) {
      throw new BadRequestException("Speech recognition result is required")
    }

    if (!speechResult.transcript || speechResult.transcript.trim().length === 0) {
      throw new BadRequestException("No transcript available")
    }

    if (speechResult.confidence < settings.minConfidence) {
      throw new BadRequestException(
        `Speech confidence too low (${speechResult.confidence} < ${settings.minConfidence})`,
      )
    }

    if (settings.allowedLanguages.length > 0 && !settings.allowedLanguages.includes(speechResult.language)) {
      throw new BadRequestException(`Language not allowed: ${speechResult.language}`)
    }
  }

  private isWhisperLevel(audioAnalysis: AudioAnalysis, settings: any): boolean {
    return (
      audioAnalysis.averageDecibel <= settings.maxDecibelLevel &&
      audioAnalysis.averageDecibel >= settings.minDecibelLevel &&
      audioAnalysis.peakDecibel <= settings.maxDecibelLevel + 10
    ) // Allow some peak tolerance
  }

  private checkPasswordMatch(transcript: string, password: string, settings: any): boolean {
    const normalizedTranscript = settings.caseSensitive ? transcript.trim() : transcript.trim().toLowerCase()
    const normalizedPassword = settings.caseSensitive ? password : password.toLowerCase()

    if (settings.requireExactMatch) {
      return normalizedTranscript === normalizedPassword
    }

    if (settings.allowPartialMatch) {
      const similarity = this.calculateSimilarity(normalizedTranscript, normalizedPassword)
      return similarity >= settings.partialMatchThreshold
    }

    // Check if password is contained in transcript or vice versa
    return normalizedTranscript.includes(normalizedPassword) || normalizedPassword.includes(normalizedTranscript)
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) {
      return 1.0
    }

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

  private getFailureReason(
    volumeValid: boolean,
    passwordMatch: boolean,
    speechResult: SpeechRecognitionResult,
    settings: any,
  ): string | undefined {
    if (!volumeValid && !passwordMatch) {
      return "Volume too loud and password incorrect"
    }

    if (!volumeValid) {
      return "Volume too loud for whisper level"
    }

    if (!passwordMatch) {
      return "Password incorrect"
    }

    if (speechResult.confidence < settings.minConfidence) {
      return "Speech recognition confidence too low"
    }

    return undefined
  }

  private updateSessionStatistics(session: WhisperSession, attempt: WhisperAttempt): void {
    const attempts = session.attempts

    // Update average decibel
    session.statistics.averageDecibel =
      attempts.reduce((sum, a) => sum + a.audioAnalysis.averageDecibel, 0) / attempts.length

    // Update average confidence
    session.statistics.averageConfidence =
      attempts.reduce((sum, a) => sum + (a.speechResult?.confidence || 0), 0) / attempts.length

    // Update best attempt
    if (
      !session.statistics.bestAttempt ||
      (attempt.success && !session.statistics.bestAttempt.success) ||
      (attempt.success === session.statistics.bestAttempt.success &&
        (attempt.speechResult?.confidence || 0) > (session.statistics.bestAttempt.speechResult?.confidence || 0))
    ) {
      session.statistics.bestAttempt = attempt
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt && session.status === "active") {
        session.status = "expired"
      }

      // Remove very old sessions (older than 24 hours)
      if (now - session.createdAt > 24 * 60 * 60 * 1000) {
        this.sessions.delete(sessionId)

        // Remove from user sessions
        const userSessionIds = this.userSessions.get(session.userId)
        if (userSessionIds) {
          const index = userSessionIds.indexOf(sessionId)
          if (index > -1) {
            userSessionIds.splice(index, 1)
          }
        }

        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old whisper sessions`)
    }
  }
}
