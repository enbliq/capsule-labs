import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { v4 as uuidv4 } from "uuid"

export interface MeditationSession {
  id: string
  userId: string
  status: "preparing" | "active" | "paused" | "completed" | "failed" | "expired"
  startTime: number
  endTime?: number
  pausedTime?: number
  totalPausedDuration: number
  requiredDuration: number
  actualDuration: number
  interruptions: Interruption[]
  createdAt: number
  expiresAt: number
  completionPercentage: number
  settings: MeditationSettings
}

export interface Interruption {
  type: "movement" | "noise" | "screen_exit" | "manual_pause"
  timestamp: number
  severity: "low" | "medium" | "high"
  description: string
  autoResume: boolean
}

export interface MeditationSettings {
  duration: number // in milliseconds
  allowPauses: boolean
  maxPauses: number
  pauseGracePeriod: number // time allowed for pauses
  movementSensitivity: "low" | "medium" | "high"
  noiseSensitivity: "low" | "medium" | "high"
  allowScreenExit: boolean
  autoFailOnInterruption: boolean
}

export interface SessionResult {
  success: boolean
  sessionId: string
  completionPercentage: number
  actualDuration: number
  requiredDuration: number
  interruptions: number
  message: string
  unlocked?: boolean
}

@Injectable()
export class MeditationChallengeService {
  private readonly logger = new Logger(MeditationChallengeService.name)
  private readonly sessions = new Map<string, MeditationSession>()
  private readonly completedSessions = new Map<string, MeditationSession[]>() // userId -> sessions

  // Default configuration
  private readonly defaultDuration = 3 * 60 * 1000 // 3 minutes
  private readonly defaultSessionExpiry = 30 * 60 * 1000 // 30 minutes
  private readonly defaultMaxPauses = 3
  private readonly defaultPauseGracePeriod = 30 * 1000 // 30 seconds

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create a new meditation session
   */
  createSession(
    userId: string,
    customSettings?: Partial<MeditationSettings>,
  ): { sessionId: string; settings: MeditationSettings } {
    // Clean up expired sessions
    this.cleanupExpiredSessions()

    const sessionId = uuidv4()
    const now = Date.now()

    const defaultSettings: MeditationSettings = {
      duration: this.configService.get<number>("MEDITATION_DURATION", this.defaultDuration),
      allowPauses: this.configService.get<boolean>("MEDITATION_ALLOW_PAUSES", true),
      maxPauses: this.configService.get<number>("MEDITATION_MAX_PAUSES", this.defaultMaxPauses),
      pauseGracePeriod: this.configService.get<number>("MEDITATION_PAUSE_GRACE_PERIOD", this.defaultPauseGracePeriod),
      movementSensitivity: this.configService.get<"low" | "medium" | "high">(
        "MEDITATION_MOVEMENT_SENSITIVITY",
        "medium",
      ),
      noiseSensitivity: this.configService.get<"low" | "medium" | "high">("MEDITATION_NOISE_SENSITIVITY", "medium"),
      allowScreenExit: this.configService.get<boolean>("MEDITATION_ALLOW_SCREEN_EXIT", false),
      autoFailOnInterruption: this.configService.get<boolean>("MEDITATION_AUTO_FAIL_ON_INTERRUPTION", false),
    }

    const settings = { ...defaultSettings, ...customSettings }

    const session: MeditationSession = {
      id: sessionId,
      userId,
      status: "preparing",
      startTime: 0,
      totalPausedDuration: 0,
      actualDuration: 0,
      requiredDuration: settings.duration,
      interruptions: [],
      createdAt: now,
      expiresAt: now + this.configService.get<number>("MEDITATION_SESSION_EXPIRY", this.defaultSessionExpiry),
      completionPercentage: 0,
      settings,
    }

    this.sessions.set(sessionId, session)
    this.logger.log(`Created meditation session ${sessionId} for user ${userId}`)

    return { sessionId, settings }
  }

  /**
   * Start a meditation session
   */
  startSession(sessionId: string): { success: boolean; message: string; startTime?: number } {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return { success: false, message: "Session not found" }
    }

    if (session.status !== "preparing") {
      return { success: false, message: `Session is already ${session.status}` }
    }

    if (session.expiresAt < Date.now()) {
      this.sessions.delete(sessionId)
      return { success: false, message: "Session has expired" }
    }

    const now = Date.now()
    session.startTime = now
    session.status = "active"
    this.sessions.set(sessionId, session)

    this.logger.log(`Started meditation session ${sessionId}`)

    // Schedule automatic completion check
    setTimeout(() => {
      this.checkSessionCompletion(sessionId)
    }, session.settings.duration)

    return {
      success: true,
      message: "Meditation session started",
      startTime: now,
    }
  }

  /**
   * Pause a meditation session
   */
  pauseSession(sessionId: string, reason = "manual"): { success: boolean; message: string } {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return { success: false, message: "Session not found" }
    }

    if (session.status !== "active") {
      return { success: false, message: `Cannot pause session in ${session.status} state` }
    }

    if (!session.settings.allowPauses) {
      // If pauses are not allowed, fail the session
      return this.failSession(sessionId, "Pauses are not allowed in this session")
    }

    const pauseCount = session.interruptions.filter((i) => i.type === "manual_pause").length

    if (pauseCount >= session.settings.maxPauses) {
      return this.failSession(sessionId, "Maximum number of pauses exceeded")
    }

    const now = Date.now()
    session.status = "paused"
    session.pausedTime = now

    // Record the interruption
    session.interruptions.push({
      type: "manual_pause",
      timestamp: now,
      severity: "low",
      description: reason,
      autoResume: false,
    })

    this.sessions.set(sessionId, session)
    this.logger.log(`Paused meditation session ${sessionId}: ${reason}`)

    return { success: true, message: "Session paused" }
  }

  /**
   * Resume a paused meditation session
   */
  resumeSession(sessionId: string): { success: boolean; message: string } {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return { success: false, message: "Session not found" }
    }

    if (session.status !== "paused") {
      return { success: false, message: `Cannot resume session in ${session.status} state` }
    }

    const now = Date.now()
    const pauseDuration = now - (session.pausedTime || now)

    // Check if pause exceeded grace period
    if (pauseDuration > session.settings.pauseGracePeriod) {
      return this.failSession(sessionId, "Pause duration exceeded grace period")
    }

    session.status = "active"
    session.totalPausedDuration += pauseDuration
    session.pausedTime = undefined

    this.sessions.set(sessionId, session)
    this.logger.log(`Resumed meditation session ${sessionId} after ${pauseDuration}ms pause`)

    return { success: true, message: "Session resumed" }
  }

  /**
   * Record an interruption (movement, noise, screen exit)
   */
  recordInterruption(
    sessionId: string,
    type: "movement" | "noise" | "screen_exit",
    severity: "low" | "medium" | "high" = "medium",
    description = "",
  ): { success: boolean; message: string; sessionEnded?: boolean } {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return { success: false, message: "Session not found" }
    }

    if (session.status !== "active") {
      return { success: false, message: "Session is not active" }
    }

    const now = Date.now()

    // Record the interruption
    const interruption: Interruption = {
      type,
      timestamp: now,
      severity,
      description: description || `${type} detected`,
      autoResume: this.shouldAutoResume(type, severity, session.settings),
    }

    session.interruptions.push(interruption)

    // Check if this interruption should fail the session
    if (this.shouldFailOnInterruption(type, severity, session.settings)) {
      const result = this.failSession(sessionId, `Session failed due to ${type}`)
      return { ...result, sessionEnded: true }
    }

    // Check if session should be paused
    if (this.shouldPauseOnInterruption(type, severity, session.settings)) {
      const pauseResult = this.pauseSession(sessionId, `Auto-paused due to ${type}`)

      // Auto-resume if configured
      if (interruption.autoResume) {
        setTimeout(() => {
          this.resumeSession(sessionId)
        }, this.getAutoResumeDelay(severity))
      }

      return { ...pauseResult, sessionEnded: false }
    }

    this.sessions.set(sessionId, session)
    this.logger.log(`Recorded ${type} interruption for session ${sessionId}`)

    return { success: true, message: `${type} interruption recorded`, sessionEnded: false }
  }

  /**
   * Get the current status of a meditation session
   */
  getSessionStatus(sessionId: string): MeditationSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    // Update completion percentage for active sessions
    if (session.status === "active") {
      this.updateSessionProgress(session)
    }

    return { ...session }
  }

  /**
   * End a meditation session manually
   */
  endSession(sessionId: string): SessionResult {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return {
        success: false,
        sessionId,
        completionPercentage: 0,
        actualDuration: 0,
        requiredDuration: 0,
        interruptions: 0,
        message: "Session not found",
      }
    }

    return this.completeSession(sessionId, false)
  }

  /**
   * Get completed sessions for a user
   */
  getUserCompletedSessions(userId: string): MeditationSession[] {
    return this.completedSessions.get(userId) || []
  }

  /**
   * Get meditation statistics for a user
   */
  getUserStatistics(userId: string): {
    totalSessions: number
    completedSessions: number
    totalMeditationTime: number
    averageSessionDuration: number
    successRate: number
    longestSession: number
    currentStreak: number
  } {
    const sessions = this.getUserCompletedSessions(userId)
    const completedSessions = sessions.filter((s) => s.status === "completed")

    const totalMeditationTime = completedSessions.reduce((sum, s) => sum + s.actualDuration, 0)
    const averageSessionDuration = completedSessions.length > 0 ? totalMeditationTime / completedSessions.length : 0
    const longestSession = Math.max(...completedSessions.map((s) => s.actualDuration), 0)

    // Calculate current streak (consecutive completed sessions from most recent)
    let currentStreak = 0
    for (let i = sessions.length - 1; i >= 0; i--) {
      if (sessions[i].status === "completed") {
        currentStreak++
      } else {
        break
      }
    }

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      totalMeditationTime,
      averageSessionDuration,
      successRate: sessions.length > 0 ? (completedSessions.length / sessions.length) * 100 : 0,
      longestSession,
      currentStreak,
    }
  }

  /**
   * Check if a session should be completed automatically
   */
  private checkSessionCompletion(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== "active") {
      return
    }

    this.updateSessionProgress(session)

    if (session.completionPercentage >= 100) {
      this.completeSession(sessionId, true)
    }
  }

  /**
   * Update session progress
   */
  private updateSessionProgress(session: MeditationSession): void {
    if (session.status !== "active" || session.startTime === 0) {
      return
    }

    const now = Date.now()
    const elapsed = now - session.startTime - session.totalPausedDuration
    session.actualDuration = Math.max(0, elapsed)
    session.completionPercentage = Math.min(100, (session.actualDuration / session.requiredDuration) * 100)
  }

  /**
   * Complete a meditation session
   */
  private completeSession(sessionId: string, automatic: boolean): SessionResult {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return {
        success: false,
        sessionId,
        completionPercentage: 0,
        actualDuration: 0,
        requiredDuration: 0,
        interruptions: 0,
        message: "Session not found",
      }
    }

    this.updateSessionProgress(session)

    const isCompleted = session.completionPercentage >= 100
    session.status = isCompleted ? "completed" : "failed"
    session.endTime = Date.now()

    // Store completed session
    if (!this.completedSessions.has(session.userId)) {
      this.completedSessions.set(session.userId, [])
    }
    this.completedSessions.get(session.userId)!.push({ ...session })

    // Remove from active sessions
    this.sessions.delete(sessionId)

    const result: SessionResult = {
      success: isCompleted,
      sessionId,
      completionPercentage: session.completionPercentage,
      actualDuration: session.actualDuration,
      requiredDuration: session.requiredDuration,
      interruptions: session.interruptions.length,
      message: isCompleted
        ? "Meditation session completed successfully! Capsule unlocked."
        : "Meditation session incomplete",
      unlocked: isCompleted,
    }

    this.logger.log(`Completed meditation session ${sessionId}: ${isCompleted ? "SUCCESS" : "FAILED"}`)

    return result
  }

  /**
   * Fail a meditation session
   */
  private failSession(sessionId: string, reason: string): { success: boolean; message: string } {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return { success: false, message: "Session not found" }
    }

    session.status = "failed"
    session.endTime = Date.now()
    this.updateSessionProgress(session)

    // Store failed session
    if (!this.completedSessions.has(session.userId)) {
      this.completedSessions.set(session.userId, [])
    }
    this.completedSessions.get(session.userId)!.push({ ...session })

    // Remove from active sessions
    this.sessions.delete(sessionId)

    this.logger.log(`Failed meditation session ${sessionId}: ${reason}`)

    return { success: false, message: reason }
  }

  /**
   * Determine if an interruption should fail the session
   */
  private shouldFailOnInterruption(
    type: "movement" | "noise" | "screen_exit",
    severity: "low" | "medium" | "high",
    settings: MeditationSettings,
  ): boolean {
    if (settings.autoFailOnInterruption) {
      return true
    }

    // Screen exit always fails if not allowed
    if (type === "screen_exit" && !settings.allowScreenExit) {
      return true
    }

    // High severity interruptions fail the session
    if (severity === "high") {
      return true
    }

    return false
  }

  /**
   * Determine if an interruption should pause the session
   */
  private shouldPauseOnInterruption(
    type: "movement" | "noise" | "screen_exit",
    severity: "low" | "medium" | "high",
    settings: MeditationSettings,
  ): boolean {
    // Don't pause if pauses aren't allowed
    if (!settings.allowPauses) {
      return false
    }

    // Medium severity interruptions pause the session
    if (severity === "medium") {
      return true
    }

    // Screen exit pauses if allowed
    if (type === "screen_exit" && settings.allowScreenExit) {
      return true
    }

    return false
  }

  /**
   * Determine if session should auto-resume after interruption
   */
  private shouldAutoResume(
    type: "movement" | "noise" | "screen_exit",
    severity: "low" | "medium" | "high",
    settings: MeditationSettings,
  ): boolean {
    // Only auto-resume for low severity interruptions
    return severity === "low"
  }

  /**
   * Get auto-resume delay based on severity
   */
  private getAutoResumeDelay(severity: "low" | "medium" | "high"): number {
    switch (severity) {
      case "low":
        return 2000 // 2 seconds
      case "medium":
        return 5000 // 5 seconds
      case "high":
        return 10000 // 10 seconds
      default:
        return 5000
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now()
    let expiredCount = 0

    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id)
        expiredCount++
      }
    }

    if (expiredCount > 0) {
      this.logger.debug(`Cleaned up ${expiredCount} expired meditation sessions`)
    }
  }
}
