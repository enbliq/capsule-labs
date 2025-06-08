import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { v4 as uuidv4 } from "uuid"

export interface FaceTrackingSession {
  id: string
  userId: string
  status: "preparing" | "active" | "completed" | "failed" | "expired"
  startTime: number
  endTime?: number
  requiredDuration: number
  actualDuration: number
  stableTrackingTime: number
  faceDetections: FaceDetection[]
  violations: TrackingViolation[]
  createdAt: number
  expiresAt: number
  completionPercentage: number
  settings: FaceTrackingSettings
  lastValidDetection?: FaceDetection
}

export interface FaceDetection {
  timestamp: number
  confidence: number
  position: FacePosition
  landmarks?: FaceLandmarks
  isValid: boolean
  violationReasons: string[]
}

export interface FacePosition {
  x: number // Center X coordinate (0-1)
  y: number // Center Y coordinate (0-1)
  width: number // Face width (0-1)
  height: number // Face height (0-1)
  rotation: number // Face rotation in degrees
  distance: number // Estimated distance from camera (0-1)
}

export interface FaceLandmarks {
  leftEye: { x: number; y: number }
  rightEye: { x: number; y: number }
  nose: { x: number; y: number }
  mouth: { x: number; y: number }
  leftEar?: { x: number; y: number }
  rightEar?: { x: number; y: number }
}

export interface TrackingViolation {
  type:
    | "face_lost"
    | "off_center"
    | "too_close"
    | "too_far"
    | "excessive_rotation"
    | "low_confidence"
    | "multiple_faces"
  timestamp: number
  severity: "low" | "medium" | "high"
  description: string
  position?: FacePosition
  duration: number
}

export interface FaceTrackingSettings {
  requiredDuration: number // in milliseconds
  centerTolerance: number // allowed deviation from center (0-1)
  minConfidence: number // minimum face detection confidence (0-1)
  maxRotation: number // maximum allowed face rotation in degrees
  minFaceSize: number // minimum face size (0-1)
  maxFaceSize: number // maximum face size (0-1)
  allowMultipleFaces: boolean
  stabilityThreshold: number // minimum stable time before counting (ms)
  maxViolationDuration: number // max time violation is allowed (ms)
  trackingFrequency: number // expected detection frequency (Hz)
}

export interface SessionResult {
  success: boolean
  sessionId: string
  completionPercentage: number
  actualDuration: number
  requiredDuration: number
  stableTrackingTime: number
  violations: number
  averageConfidence: number
  message: string
  unlocked?: boolean
}

@Injectable()
export class FaceTrackingChallengeService {
  private readonly logger = new Logger(FaceTrackingChallengeService.name)
  private readonly sessions = new Map<string, FaceTrackingSession>()
  private readonly completedSessions = new Map<string, FaceTrackingSession[]>() // userId -> sessions

  // Default configuration
  private readonly defaultRequiredDuration = 10000 // 10 seconds
  private readonly defaultSessionExpiry = 5 * 60 * 1000 // 5 minutes
  private readonly defaultCenterTolerance = 0.2 // 20% deviation allowed
  private readonly defaultMinConfidence = 0.7 // 70% confidence required
  private readonly defaultMaxRotation = 15 // 15 degrees max rotation
  private readonly defaultStabilityThreshold = 1000 // 1 second stability required

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create a new face tracking session
   */
  createSession(
    userId: string,
    customSettings?: Partial<FaceTrackingSettings>,
  ): { sessionId: string; settings: FaceTrackingSettings } {
    // Clean up expired sessions
    this.cleanupExpiredSessions()

    const sessionId = uuidv4()
    const now = Date.now()

    const defaultSettings: FaceTrackingSettings = {
      requiredDuration: this.configService.get<number>("FACE_TRACKING_DURATION", this.defaultRequiredDuration),
      centerTolerance: this.configService.get<number>("FACE_TRACKING_CENTER_TOLERANCE", this.defaultCenterTolerance),
      minConfidence: this.configService.get<number>("FACE_TRACKING_MIN_CONFIDENCE", this.defaultMinConfidence),
      maxRotation: this.configService.get<number>("FACE_TRACKING_MAX_ROTATION", this.defaultMaxRotation),
      minFaceSize: this.configService.get<number>("FACE_TRACKING_MIN_FACE_SIZE", 0.1),
      maxFaceSize: this.configService.get<number>("FACE_TRACKING_MAX_FACE_SIZE", 0.8),
      allowMultipleFaces: this.configService.get<boolean>("FACE_TRACKING_ALLOW_MULTIPLE_FACES", false),
      stabilityThreshold: this.configService.get<number>(
        "FACE_TRACKING_STABILITY_THRESHOLD",
        this.defaultStabilityThreshold,
      ),
      maxViolationDuration: this.configService.get<number>("FACE_TRACKING_MAX_VIOLATION_DURATION", 2000),
      trackingFrequency: this.configService.get<number>("FACE_TRACKING_FREQUENCY", 10), // 10 Hz
    }

    const settings = { ...defaultSettings, ...customSettings }

    const session: FaceTrackingSession = {
      id: sessionId,
      userId,
      status: "preparing",
      startTime: 0,
      requiredDuration: settings.requiredDuration,
      actualDuration: 0,
      stableTrackingTime: 0,
      faceDetections: [],
      violations: [],
      createdAt: now,
      expiresAt: now + this.configService.get<number>("FACE_TRACKING_SESSION_EXPIRY", this.defaultSessionExpiry),
      completionPercentage: 0,
      settings,
    }

    this.sessions.set(sessionId, session)
    this.logger.log(`Created face tracking session ${sessionId} for user ${userId}`)

    return { sessionId, settings }
  }

  /**
   * Start a face tracking session
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

    this.logger.log(`Started face tracking session ${sessionId}`)

    return {
      success: true,
      message: "Face tracking session started",
      startTime: now,
    }
  }

  /**
   * Process a face detection frame
   */
  processFaceDetection(
    sessionId: string,
    detections: Array<{
      confidence: number
      position: FacePosition
      landmarks?: FaceLandmarks
    }>,
  ): {
    success: boolean
    message: string
    isValid: boolean
    violations: string[]
    progress: number
    sessionEnded?: boolean
  } {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return {
        success: false,
        message: "Session not found",
        isValid: false,
        violations: [],
        progress: 0,
      }
    }

    if (session.status !== "active") {
      return {
        success: false,
        message: `Session is not active (status: ${session.status})`,
        isValid: false,
        violations: [],
        progress: session.completionPercentage,
      }
    }

    const now = Date.now()
    const violations: string[] = []
    let isValid = false

    // Validate detections
    if (detections.length === 0) {
      violations.push("No face detected")
      this.recordViolation(session, "face_lost", "high", "No face detected in frame", undefined, now)
    } else if (detections.length > 1 && !session.settings.allowMultipleFaces) {
      violations.push("Multiple faces detected")
      this.recordViolation(session, "multiple_faces", "high", "Multiple faces detected", detections[0].position, now)
    } else {
      // Process the primary face detection
      const detection = detections[0]
      const validationResult = this.validateFaceDetection(detection, session.settings)

      violations.push(...validationResult.violations)
      isValid = validationResult.isValid

      // Record the detection
      const faceDetection: FaceDetection = {
        timestamp: now,
        confidence: detection.confidence,
        position: detection.position,
        landmarks: detection.landmarks,
        isValid,
        violationReasons: validationResult.violations,
      }

      session.faceDetections.push(faceDetection)

      if (isValid) {
        session.lastValidDetection = faceDetection
      }

      // Record violations
      for (const violation of validationResult.detailedViolations) {
        this.recordViolation(
          session,
          violation.type,
          violation.severity,
          violation.description,
          detection.position,
          now,
        )
      }
    }

    // Update session progress
    this.updateSessionProgress(session, isValid, now)

    // Check if session should be completed
    if (session.completionPercentage >= 100) {
      const result = this.completeSession(sessionId, true)
      return {
        success: true,
        message: "Face tracking completed successfully!",
        isValid,
        violations,
        progress: 100,
        sessionEnded: true,
      }
    }

    // Check if session should fail due to excessive violations
    if (this.shouldFailSession(session)) {
      this.failSession(sessionId, "Too many tracking violations")
      return {
        success: false,
        message: "Session failed due to tracking violations",
        isValid: false,
        violations,
        progress: session.completionPercentage,
        sessionEnded: true,
      }
    }

    this.sessions.set(sessionId, session)

    return {
      success: true,
      message: isValid ? "Face tracking in progress" : "Face tracking violations detected",
      isValid,
      violations,
      progress: session.completionPercentage,
    }
  }

  /**
   * Get the current status of a face tracking session
   */
  getSessionStatus(sessionId: string): FaceTrackingSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    // Update progress for active sessions
    if (session.status === "active") {
      this.updateSessionProgress(session, false, Date.now())
    }

    return { ...session }
  }

  /**
   * End a face tracking session manually
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
        stableTrackingTime: 0,
        violations: 0,
        averageConfidence: 0,
        message: "Session not found",
      }
    }

    return this.completeSession(sessionId, false)
  }

  /**
   * Get completed sessions for a user
   */
  getUserCompletedSessions(userId: string): FaceTrackingSession[] {
    return this.completedSessions.get(userId) || []
  }

  /**
   * Get face tracking statistics for a user
   */
  getUserStatistics(userId: string): {
    totalSessions: number
    completedSessions: number
    totalTrackingTime: number
    averageSessionDuration: number
    successRate: number
    bestSession: number
    averageConfidence: number
    currentStreak: number
  } {
    const sessions = this.getUserCompletedSessions(userId)
    const completedSessions = sessions.filter((s) => s.status === "completed")

    const totalTrackingTime = sessions.reduce((sum, s) => sum + s.stableTrackingTime, 0)
    const averageSessionDuration =
      sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.actualDuration, 0) / sessions.length : 0
    const bestSession = Math.max(...completedSessions.map((s) => s.stableTrackingTime), 0)

    // Calculate average confidence across all sessions
    const allDetections = sessions.flatMap((s) => s.faceDetections.filter((d) => d.isValid))
    const averageConfidence =
      allDetections.length > 0 ? allDetections.reduce((sum, d) => sum + d.confidence, 0) / allDetections.length : 0

    // Calculate current streak
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
      totalTrackingTime,
      averageSessionDuration,
      successRate: sessions.length > 0 ? (completedSessions.length / sessions.length) * 100 : 0,
      bestSession,
      averageConfidence,
      currentStreak,
    }
  }

  /**
   * Validate a face detection against session settings
   */
  private validateFaceDetection(
    detection: { confidence: number; position: FacePosition; landmarks?: FaceLandmarks },
    settings: FaceTrackingSettings,
  ): {
    isValid: boolean
    violations: string[]
    detailedViolations: Array<{ type: any; severity: any; description: string }>
  } {
    const violations: string[] = []
    const detailedViolations: Array<{ type: any; severity: any; description: string }> = []

    // Check confidence
    if (detection.confidence < settings.minConfidence) {
      violations.push(`Low confidence: ${(detection.confidence * 100).toFixed(1)}%`)
      detailedViolations.push({
        type: "low_confidence",
        severity: "medium",
        description: `Face detection confidence too low: ${(detection.confidence * 100).toFixed(1)}%`,
      })
    }

    // Check center position
    const centerX = 0.5
    const centerY = 0.5
    const distanceFromCenter = Math.sqrt(
      Math.pow(detection.position.x - centerX, 2) + Math.pow(detection.position.y - centerY, 2),
    )

    if (distanceFromCenter > settings.centerTolerance) {
      violations.push("Face not centered")
      detailedViolations.push({
        type: "off_center",
        severity: "medium",
        description: `Face is off-center by ${(distanceFromCenter * 100).toFixed(1)}%`,
      })
    }

    // Check face size
    if (detection.position.width < settings.minFaceSize || detection.position.height < settings.minFaceSize) {
      violations.push("Face too small/far")
      detailedViolations.push({
        type: "too_far",
        severity: "medium",
        description: "Face appears too small in frame",
      })
    }

    if (detection.position.width > settings.maxFaceSize || detection.position.height > settings.maxFaceSize) {
      violations.push("Face too large/close")
      detailedViolations.push({
        type: "too_close",
        severity: "medium",
        description: "Face appears too large in frame",
      })
    }

    // Check rotation
    if (Math.abs(detection.position.rotation) > settings.maxRotation) {
      violations.push(`Excessive rotation: ${detection.position.rotation.toFixed(1)}°`)
      detailedViolations.push({
        type: "excessive_rotation",
        severity: "medium",
        description: `Face rotation exceeds limit: ${detection.position.rotation.toFixed(1)}°`,
      })
    }

    return {
      isValid: violations.length === 0,
      violations,
      detailedViolations,
    }
  }

  /**
   * Record a tracking violation
   */
  private recordViolation(
    session: FaceTrackingSession,
    type: TrackingViolation["type"],
    severity: TrackingViolation["severity"],
    description: string,
    position: FacePosition | undefined,
    timestamp: number,
  ): void {
    const violation: TrackingViolation = {
      type,
      timestamp,
      severity,
      description,
      position,
      duration: 0, // Will be calculated when violation ends
    }

    session.violations.push(violation)
  }

  /**
   * Update session progress based on current tracking state
   */
  private updateSessionProgress(session: FaceTrackingSession, isValidDetection: boolean, currentTime: number): void {
    if (session.startTime === 0) {
      return
    }

    session.actualDuration = currentTime - session.startTime

    // Update stable tracking time
    if (isValidDetection) {
      // Check if we have enough consecutive valid detections for stability
      const recentDetections = session.faceDetections
        .filter((d) => d.timestamp > currentTime - session.settings.stabilityThreshold)
        .filter((d) => d.isValid)

      if (
        recentDetections.length >=
        session.settings.stabilityThreshold / (1000 / session.settings.trackingFrequency)
      ) {
        // We have stable tracking, add to stable time
        const timeSinceLastUpdate =
          session.faceDetections.length > 1
            ? currentTime - session.faceDetections[session.faceDetections.length - 2].timestamp
            : 1000 / session.settings.trackingFrequency

        session.stableTrackingTime += timeSinceLastUpdate
      }
    }

    // Calculate completion percentage based on stable tracking time
    session.completionPercentage = Math.min(100, (session.stableTrackingTime / session.requiredDuration) * 100)
  }

  /**
   * Check if session should fail due to violations
   */
  private shouldFailSession(session: FaceTrackingSession): boolean {
    const now = Date.now()
    const recentViolations = session.violations.filter((v) => now - v.timestamp < session.settings.maxViolationDuration)

    // Fail if too many high-severity violations
    const highSeverityViolations = recentViolations.filter((v) => v.severity === "high")
    if (highSeverityViolations.length >= 3) {
      return true
    }

    // Fail if session has been running too long without progress
    const maxSessionDuration = session.settings.requiredDuration * 3 // 3x the required duration
    if (session.actualDuration > maxSessionDuration) {
      return true
    }

    return false
  }

  /**
   * Complete a face tracking session
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
        stableTrackingTime: 0,
        violations: 0,
        averageConfidence: 0,
        message: "Session not found",
      }
    }

    this.updateSessionProgress(session, false, Date.now())

    const isCompleted = session.completionPercentage >= 100
    session.status = isCompleted ? "completed" : "failed"
    session.endTime = Date.now()

    // Calculate average confidence
    const validDetections = session.faceDetections.filter((d) => d.isValid)
    const averageConfidence =
      validDetections.length > 0
        ? validDetections.reduce((sum, d) => sum + d.confidence, 0) / validDetections.length
        : 0

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
      stableTrackingTime: session.stableTrackingTime,
      violations: session.violations.length,
      averageConfidence,
      message: isCompleted
        ? "Face tracking completed successfully! Capsule unlocked."
        : "Face tracking session incomplete",
      unlocked: isCompleted,
    }

    this.logger.log(`Completed face tracking session ${sessionId}: ${isCompleted ? "SUCCESS" : "FAILED"}`)

    return result
  }

  /**
   * Fail a face tracking session
   */
  private failSession(sessionId: string, reason: string): { success: boolean; message: string } {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return { success: false, message: "Session not found" }
    }

    session.status = "failed"
    session.endTime = Date.now()
    this.updateSessionProgress(session, false, Date.now())

    // Store failed session
    if (!this.completedSessions.has(session.userId)) {
      this.completedSessions.set(session.userId, [])
    }
    this.completedSessions.get(session.userId)!.push({ ...session })

    // Remove from active sessions
    this.sessions.delete(sessionId)

    this.logger.log(`Failed face tracking session ${sessionId}: ${reason}`)

    return { success: false, message: reason }
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
      this.logger.debug(`Cleaned up ${expiredCount} expired face tracking sessions`)
    }
  }
}
