import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { v4 as uuidv4 } from "uuid"
import type { FlipSession, FlipAttempt, FlipCapsuleUnlock, FlipChallengeConfig } from "../entities/flip-capsule.entity"
import type { OrientationDataDto, FlipStatusDto, FlipSessionDto } from "../dto/orientation.dto"
import type { OrientationValidatorService } from "./orientation-validator.service"
import type { NotificationService } from "./notification.service"

@Injectable()
export class FlipSessionService {
  private readonly logger = new Logger(FlipSessionService.name)
  private readonly activeSessions = new Map<
    string,
    {
      userId: string
      startTime: Date
      lastUpdateTime: Date
      flippedStartTime: Date | null
      flippedDuration: number
      isFlipped: boolean
      previousOrientation: OrientationDataDto | null
      orientationHistory: Array<{ time: Date; orientation: OrientationDataDto; isFlipped: boolean }>
      requiredDuration: number
      isComplete: boolean
      deviceInfo: Record<string, any>
    }
  >()

  constructor(
    private readonly flipSessionRepository: Repository<FlipSession>,
    private readonly flipAttemptRepository: Repository<FlipAttempt>,
    private readonly flipUnlockRepository: Repository<FlipCapsuleUnlock>,
    private readonly flipConfigRepository: Repository<FlipChallengeConfig>,
    private readonly orientationValidator: OrientationValidatorService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Start a new flip session for a user
   */
  async startSession(
    userId: string,
    deviceInfo: Record<string, any>,
  ): Promise<{
    sessionId: string
    requiredDuration: number
  }> {
    // Get active configuration
    const config = await this.getActiveConfig()

    // Create session ID
    const sessionId = uuidv4()

    // Create session in memory
    this.activeSessions.set(sessionId, {
      userId,
      startTime: new Date(),
      lastUpdateTime: new Date(),
      flippedStartTime: null,
      flippedDuration: 0,
      isFlipped: false,
      previousOrientation: null,
      orientationHistory: [],
      requiredDuration: config.requiredDuration,
      isComplete: false,
      deviceInfo,
    })

    // Create session in database
    const session = this.flipSessionRepository.create({
      id: sessionId,
      userId,
      startTime: new Date(),
      requiredDuration: config.requiredDuration,
      deviceInfo,
    })

    await this.flipSessionRepository.save(session)

    this.logger.log(`Started flip session ${sessionId} for user ${userId}`)

    return {
      sessionId,
      requiredDuration: config.requiredDuration,
    }
  }

  /**
   * Process orientation update from client
   */
  async processOrientationUpdate(sessionId: string, orientation: OrientationDataDto): Promise<FlipStatusDto | null> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      this.logger.warn(`Received orientation update for unknown session: ${sessionId}`)
      return null
    }

    // Get active configuration
    const config = await this.getActiveConfig()

    // Update last activity time
    session.lastUpdateTime = new Date()

    // Check if device is currently flipped
    const isFlipped = this.orientationValidator.isDeviceFlipped(orientation, config)

    // Add to orientation history (limited to last 10 readings)
    session.orientationHistory.push({
      time: new Date(),
      orientation,
      isFlipped,
    })
    if (session.orientationHistory.length > 10) {
      session.orientationHistory.shift()
    }

    // Handle state transitions
    if (isFlipped && !session.isFlipped) {
      // Just flipped - start the timer
      session.isFlipped = true
      session.flippedStartTime = new Date()
      this.logger.log(`Device flipped in session ${sessionId}`)
    } else if (!isFlipped && session.isFlipped) {
      // Just un-flipped - record the attempt
      session.isFlipped = false
      const flippedEndTime = new Date()
      const flippedDuration = session.flippedStartTime
        ? flippedEndTime.getTime() - session.flippedStartTime.getTime()
        : 0

      session.flippedDuration = 0
      await this.recordAttempt(sessionId, session.userId, session.flippedStartTime!, flippedDuration, false, {
        startOrientation: session.orientationHistory[0]?.orientation,
        endOrientation: orientation,
      })

      this.logger.log(`Device un-flipped in session ${sessionId} after ${flippedDuration}ms`)
    } else if (isFlipped && session.isFlipped) {
      // Still flipped - update duration
      const currentDuration = session.flippedStartTime ? new Date().getTime() - session.flippedStartTime.getTime() : 0
      session.flippedDuration = currentDuration

      // Check if the required duration has been reached
      if (currentDuration >= session.requiredDuration && !session.isComplete) {
        session.isComplete = true
        await this.completeSession(sessionId, session)
      }
    }

    // Update previous orientation
    session.previousOrientation = orientation

    // Return current status
    return {
      isFlipped: session.isFlipped,
      elapsedTime: session.flippedDuration,
      remainingTime: Math.max(0, session.requiredDuration - session.flippedDuration),
      isComplete: session.isComplete,
      sessionId,
    }
  }

  /**
   * Record a flip attempt
   */
  private async recordAttempt(
    sessionId: string,
    userId: string,
    attemptTime: Date,
    durationMs: number,
    wasSuccessful: boolean,
    orientationData: any,
  ): Promise<FlipAttempt> {
    const attempt = this.flipAttemptRepository.create({
      sessionId,
      userId,
      attemptTime,
      durationMs,
      wasSuccessful,
      orientationData,
    })

    return this.flipAttemptRepository.save(attempt)
  }

  /**
   * Complete a session and unlock the capsule if successful
   */
  private async completeSession(sessionId: string, sessionData: any): Promise<void> {
    // Update session in database
    const session = await this.flipSessionRepository.findOne({
      where: { id: sessionId },
    })

    if (!session) {
      this.logger.error(`Failed to find session ${sessionId} for completion`)
      return
    }

    session.isComplete = true
    session.endTime = new Date()
    session.capsuleUnlocked = true
    session.capsuleUnlockedAt = new Date()
    session.orientationData = {
      initialOrientation: sessionData.orientationHistory[0]?.orientation,
      finalOrientation: sessionData.orientationHistory[sessionData.orientationHistory.length - 1]?.orientation,
      orientationChanges: sessionData.orientationHistory.length,
    }

    await this.flipSessionRepository.save(session)

    // Get all attempts for this session
    const attempts = await this.flipAttemptRepository.find({
      where: { sessionId },
    })

    // Create unlock record
    const unlock = this.flipUnlockRepository.create({
      userId: sessionData.userId,
      sessionId,
      unlockedAt: new Date(),
      totalAttempts: attempts.length + 1, // Include the successful attempt
      sessionDurationSeconds: Math.floor((new Date().getTime() - sessionData.startTime.getTime()) / 1000),
      unlockDetails: {
        deviceInfo: sessionData.deviceInfo,
        orientationData: session.orientationData,
        attemptIds: attempts.map((a) => a.id),
      },
    })

    await this.flipUnlockRepository.save(unlock)

    // Send notification
    await this.notificationService.sendCapsuleUnlockedNotification(sessionData.userId)

    this.logger.log(`🎉 Flip Capsule unlocked for user ${sessionData.userId}!`)
  }

  /**
   * End a session (called when user disconnects or abandons)
   */
  async endSession(sessionId: string): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId)
    if (!sessionData) {
      return
    }

    // If session was in flipped state, record the final attempt
    if (sessionData.isFlipped && sessionData.flippedStartTime) {
      const flippedDuration = new Date().getTime() - sessionData.flippedStartTime.getTime()
      const wasSuccessful = flippedDuration >= sessionData.requiredDuration

      await this.recordAttempt(
        sessionId,
        sessionData.userId,
        sessionData.flippedStartTime,
        flippedDuration,
        wasSuccessful,
        {
          startOrientation: sessionData.orientationHistory[0]?.orientation,
          endOrientation: sessionData.previousOrientation,
        },
      )

      // If successful but not marked complete (e.g., client disconnected before receiving completion)
      if (wasSuccessful && !sessionData.isComplete) {
        await this.completeSession(sessionId, sessionData)
      }
    }

    // Update session in database if not complete
    if (!sessionData.isComplete) {
      const session = await this.flipSessionRepository.findOne({
        where: { id: sessionId },
      })

      if (session) {
        session.endTime = new Date()
        await this.flipSessionRepository.save(session)
      }
    }

    // Remove from active sessions
    this.activeSessions.delete(sessionId)

    this.logger.log(`Ended flip session ${sessionId}`)
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId: string): Promise<FlipSessionDto | null> {
    const sessionData = this.activeSessions.get(sessionId)
    if (sessionData) {
      return {
        sessionId,
        startTime: sessionData.startTime,
        endTime: sessionData.isComplete ? new Date() : undefined,
        requiredDuration: sessionData.requiredDuration,
        isComplete: sessionData.isComplete,
        deviceInfo: sessionData.deviceInfo,
      }
    }

    // Try to get from database
    const session = await this.flipSessionRepository.findOne({
      where: { id: sessionId },
    })

    if (!session) {
      return null
    }

    return {
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      requiredDuration: session.requiredDuration,
      isComplete: session.isComplete,
      deviceInfo: session.deviceInfo,
    }
  }

  /**
   * Get active configuration
   */
  async getActiveConfig(): Promise<FlipChallengeConfig> {
    const config = await this.flipConfigRepository.findOne({
      where: { isActive: true },
    })

    if (!config) {
      // Return default config
      return this.flipConfigRepository.create({
        requiredDuration: 30000, // 30 seconds
        betaThreshold: 150,
        gammaThreshold: 0,
        stabilityThreshold: 15,
        requireAbsoluteSensors: false,
        isActive: true,
        name: "Default Configuration",
        description: "Default flip challenge configuration",
      })
    }

    return config
  }

  /**
   * Update configuration
   */
  async updateConfig(configData: Partial<FlipChallengeConfig>): Promise<FlipChallengeConfig> {
    // If updating active config, deactivate all others
    if (configData.isActive) {
      await this.flipConfigRepository.update({}, { isActive: false })
    }

    // Create new config
    const config = this.flipConfigRepository.create({
      ...configData,
      name: configData.name || `Configuration ${new Date().toISOString()}`,
    })

    return this.flipConfigRepository.save(config)
  }

  /**
   * Get user's unlock status
   */
  async getUserUnlockStatus(userId: string): Promise<{
    hasUnlockedCapsule: boolean
    lastSession: FlipSession | null
    totalAttempts: number
    unlockDetails: FlipCapsuleUnlock | null
  }> {
    // Check if user has unlocked the capsule
    const unlock = await this.flipUnlockRepository.findOne({
      where: { userId },
    })

    // Get last session
    const lastSession = await this.flipSessionRepository.findOne({
      where: { userId },
      order: { createdAt: "DESC" },
    })

    // Count total attempts
    const totalAttempts = await this.flipAttemptRepository.count({
      where: { userId },
    })

    return {
      hasUnlockedCapsule: !!unlock,
      lastSession,
      totalAttempts,
      unlockDetails: unlock,
    }
  }

  /**
   * Get session history for a user
   */
  async getUserSessionHistory(
    userId: string,
    limit = 10,
  ): Promise<{
    sessions: FlipSession[]
    attempts: Record<string, FlipAttempt[]>
  }> {
    // Get sessions
    const sessions = await this.flipSessionRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    })

    // Get attempts for these sessions
    const sessionIds = sessions.map((s) => s.id)
    const attempts = await this.flipAttemptRepository.find({
      where: { sessionId: { $in: sessionIds } as any },
      order: { attemptTime: "ASC" },
    })

    // Group attempts by session
    const attemptsBySession = attempts.reduce(
      (acc, attempt) => {
        if (!acc[attempt.sessionId]) {
          acc[attempt.sessionId] = []
        }
        acc[attempt.sessionId].push(attempt)
        return acc
      },
      {} as Record<string, FlipAttempt[]>,
    )

    return {
      sessions,
      attempts: attemptsBySession,
    }
  }

  /**
   * Clean up inactive sessions
   */
  async cleanupInactiveSessions(): Promise<void> {
    const now = new Date()
    const inactiveThreshold = 5 * 60 * 1000 // 5 minutes

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const inactiveDuration = now.getTime() - session.lastUpdateTime.getTime()
      if (inactiveDuration > inactiveThreshold) {
        await this.endSession(sessionId)
      }
    }
  }
}
