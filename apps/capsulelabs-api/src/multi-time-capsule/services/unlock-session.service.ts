import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import {
  TimeZoneUnlockSession,
  type TimeZoneAccessAttempt,
  type TimeZoneCapsuleUnlock,
} from "../entities/multi-time-capsule.entity"
import type { TimeZoneService } from "./timezone.service"
import type { NotificationService } from "./notification.service"
import { Cron } from "@nestjs/schedule"

@Injectable()
export class UnlockSessionService {
  private readonly logger = new Logger(UnlockSessionService.name);

  constructor(
    private sessionRepository: Repository<TimeZoneUnlockSession>,
    private attemptRepository: Repository<TimeZoneAccessAttempt>,
    private unlockRepository: Repository<TimeZoneCapsuleUnlock>,
    private timeZoneService: TimeZoneService,
    private notificationService: NotificationService,
    @InjectRepository(TimeZoneUnlockSession)
  ) {}

  async startUnlockSession(
    userId: string,
    timeZones: string[],
    targetHour?: number,
  ): Promise<{
    session: TimeZoneUnlockSession
    currentStatus: any
  }> {
    // Validate time zones
    const invalidTimeZones = timeZones.filter((tz) => !this.timeZoneService.validateTimeZone(tz))
    if (invalidTimeZones.length > 0) {
      throw new BadRequestException(`Invalid time zones: ${invalidTimeZones.join(", ")}`)
    }

    if (timeZones.length < 3) {
      throw new BadRequestException("Must specify at least 3 time zones")
    }

    // Check if user has an active session
    const existingSession = await this.sessionRepository.findOne({
      where: {
        userId,
        status: "active",
      },
    })

    if (existingSession) {
      // Return existing session status
      const currentStatus = await this.getSessionStatus(userId, existingSession.id)
      return {
        session: existingSession,
        currentStatus,
      }
    }

    // Determine target hour
    let sessionTargetHour = targetHour
    if (!sessionTargetHour) {
      // Use current hour in first timezone as target
      const timeInfo = this.timeZoneService.getCurrentTimeInZone(timeZones[0])
      sessionTargetHour = timeInfo.localHour
    }

    // Create new session
    const session = this.sessionRepository.create({
      userId,
      targetHour: sessionTargetHour,
      requiredTimeZones: timeZones,
      completedTimeZones: [],
      sessionStartTime: new Date(),
      status: "active",
      sessionTimeoutMinutes: 60, // 1 hour to complete
      unlockData: {
        accessAttempts: [],
        completionOrder: [],
      },
    })

    await this.sessionRepository.save(session)

    const currentStatus = await this.getSessionStatus(userId, session.id)

    this.logger.log(`Started unlock session for user ${userId} with target hour ${sessionTargetHour}`)

    return {
      session,
      currentStatus,
    }
  }

  async recordAccessAttempt(
    userId: string,
    timeZone: string,
    metadata?: any,
  ): Promise<{
    success: boolean
    attempt: TimeZoneAccessAttempt
    sessionUpdated: boolean
    capsuleUnlocked: boolean
    sessionStatus?: any
  }> {
    // Get active session
    const session = await this.sessionRepository.findOne({
      where: {
        userId,
        status: "active",
      },
    })

    if (!session) {
      throw new NotFoundException("No active unlock session found")
    }

    // Check if session has expired
    const now = new Date()
    const sessionExpiry = new Date(session.sessionStartTime.getTime() + session.sessionTimeoutMinutes * 60 * 1000)

    if (now > sessionExpiry) {
      session.status = "expired"
      await this.sessionRepository.save(session)
      throw new BadRequestException("Unlock session has expired")
    }

    // Validate timezone is part of required zones
    if (!session.requiredTimeZones.includes(timeZone)) {
      throw new BadRequestException("Time zone is not part of the current unlock session")
    }

    // Check if this timezone was already completed
    if (session.completedTimeZones.includes(timeZone)) {
      throw new BadRequestException("This time zone has already been completed in this session")
    }

    // Get current time in the specified timezone
    const timeInfo = this.timeZoneService.getCurrentTimeInZone(timeZone)

    if (!timeInfo.isValid) {
      throw new BadRequestException("Invalid time zone")
    }

    // Check if current hour matches target hour
    const isValidAttempt = timeInfo.localHour === session.targetHour

    // Record the attempt
    const attempt = this.attemptRepository.create({
      userId,
      timeZone,
      accessTime: timeInfo.currentTime,
      localHour: timeInfo.localHour,
      localTimeString: timeInfo.localTimeString,
      utcOffset: timeInfo.utcOffset,
      isValidAttempt,
      sessionId: session.id,
      metadata: {
        ...metadata,
        targetHour: session.targetHour,
        sessionId: session.id,
      },
    })

    await this.attemptRepository.save(attempt)

    let sessionUpdated = false
    let capsuleUnlocked = false

    if (isValidAttempt) {
      // Add to completed time zones
      session.completedTimeZones.push(timeZone)
      session.unlockData.accessAttempts.push(attempt.id)
      session.unlockData.completionOrder.push(timeZone)

      // Check if all required time zones are completed
      if (session.completedTimeZones.length >= session.requiredTimeZones.length) {
        session.status = "completed"
        session.sessionEndTime = new Date()
        session.capsuleUnlocked = true
        session.capsuleUnlockedAt = new Date()

        // Calculate session duration
        const durationMs = session.sessionEndTime.getTime() - session.sessionStartTime.getTime()
        session.unlockData.totalDuration = Math.floor(durationMs / (1000 * 60)) // minutes

        // Create unlock record
        await this.createUnlockRecord(session, attempt)

        capsuleUnlocked = true

        // Send notification
        await this.notificationService.sendCapsuleUnlockedNotification(userId, "multi-time")

        this.logger.log(`🎉 Multi-Time Capsule unlocked for user ${userId}!`)
      }

      await this.sessionRepository.save(session)
      sessionUpdated = true
    }

    const sessionStatus = await this.getSessionStatus(userId, session.id)

    return {
      success: isValidAttempt,
      attempt,
      sessionUpdated,
      capsuleUnlocked,
      sessionStatus,
    }
  }

  async getSessionStatus(
    userId: string,
    sessionId: string,
  ): Promise<{
    session: TimeZoneUnlockSession
    progress: {
      completed: number
      total: number
      remaining: string[]
      nextTargetTimes: any[]
    }
    timeUntilExpiry: number
    currentTimeInZones: any[]
  }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    })

    if (!session) {
      throw new NotFoundException("Session not found")
    }

    const remaining = session.requiredTimeZones.filter((tz) => !session.completedTimeZones.includes(tz))

    const nextTargetTimes = this.timeZoneService.getOptimalAccessTimes(remaining, session.targetHour)

    const currentTimeInZones = this.timeZoneService.getTimeInMultipleZones(session.requiredTimeZones)

    const now = new Date()
    const sessionExpiry = new Date(session.sessionStartTime.getTime() + session.sessionTimeoutMinutes * 60 * 1000)
    const timeUntilExpiry = Math.max(0, Math.floor((sessionExpiry.getTime() - now.getTime()) / (1000 * 60))) // minutes

    return {
      session,
      progress: {
        completed: session.completedTimeZones.length,
        total: session.requiredTimeZones.length,
        remaining,
        nextTargetTimes,
      },
      timeUntilExpiry,
      currentTimeInZones,
    }
  }

  async getActiveSession(userId: string): Promise<TimeZoneUnlockSession | null> {
    return this.sessionRepository.findOne({
      where: {
        userId,
        status: "active",
      },
    })
  }

  async cancelSession(userId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: {
        userId,
        status: "active",
      },
    })

    if (session) {
      session.status = "failed"
      session.sessionEndTime = new Date()
      await this.sessionRepository.save(session)

      this.logger.log(`Cancelled unlock session for user ${userId}`)
    }
  }

  private async createUnlockRecord(session: TimeZoneUnlockSession, finalAttempt: TimeZoneAccessAttempt): Promise<void> {
    const durationMinutes = session.unlockData.totalDuration || 0

    const unlockRecord = this.unlockRepository.create({
      userId: session.userId,
      sessionId: session.id,
      unlockedAtHour: session.targetHour,
      timeZonesUsed: session.completedTimeZones,
      unlockedAt: session.capsuleUnlockedAt!,
      totalAttempts: session.unlockData.accessAttempts.length,
      sessionDurationMinutes: durationMinutes,
      unlockDetails: {
        accessOrder: session.unlockData.completionOrder,
        timingDetails: {
          sessionStart: session.sessionStartTime,
          sessionEnd: session.sessionEndTime,
          targetHour: session.targetHour,
        },
        achievements: this.calculateAchievements(session, durationMinutes),
      },
    })

    await this.unlockRepository.save(unlockRecord)
  }

  private calculateAchievements(session: TimeZoneUnlockSession, durationMinutes: number): string[] {
    const achievements: string[] = []

    if (durationMinutes <= 5) {
      achievements.push("Speed Demon - Unlocked in under 5 minutes")
    } else if (durationMinutes <= 15) {
      achievements.push("Quick Traveler - Unlocked in under 15 minutes")
    }

    if (session.requiredTimeZones.length >= 5) {
      achievements.push("Globe Trotter - Used 5+ time zones")
    }

    if (session.targetHour === 12) {
      achievements.push("High Noon - Unlocked at noon")
    } else if (session.targetHour === 0) {
      achievements.push("Midnight Explorer - Unlocked at midnight")
    }

    // Check for continental diversity
    const continents = new Set(
      session.completedTimeZones.map((tz) => {
        if (tz.startsWith("Africa/")) return "Africa"
        if (tz.startsWith("Asia/")) return "Asia"
        if (tz.startsWith("Europe/")) return "Europe"
        if (tz.startsWith("America/")) return "Americas"
        if (tz.startsWith("Australia/") || tz.startsWith("Pacific/")) return "Oceania"
        return "Other"
      }),
    )

    if (continents.size >= 3) {
      achievements.push("Continental Connector - Spanned 3+ continents")
    }

    return achievements
  }

  @Cron("*/5 * * * *") // Run every 5 minutes
  async cleanupExpiredSessions() {
    const now = new Date()
    const expiredSessions = await this.sessionRepository.find({
      where: {
        status: "active",
      },
    })

    for (const session of expiredSessions) {
      const sessionExpiry = new Date(session.sessionStartTime.getTime() + session.sessionTimeoutMinutes * 60 * 1000)

      if (now > sessionExpiry) {
        session.status = "expired"
        session.sessionEndTime = now
        await this.sessionRepository.save(session)

        this.logger.log(`Expired session ${session.id} for user ${session.userId}`)
      }
    }
  }

  async getUserUnlockHistory(userId: string): Promise<{
    totalUnlocks: number
    unlocks: TimeZoneCapsuleUnlock[]
    favoriteHour: number | null
    favoriteTimeZones: string[]
    averageSessionDuration: number
  }> {
    const unlocks = await this.unlockRepository.find({
      where: { userId },
      order: { unlockedAt: "DESC" },
    })

    if (unlocks.length === 0) {
      return {
        totalUnlocks: 0,
        unlocks: [],
        favoriteHour: null,
        favoriteTimeZones: [],
        averageSessionDuration: 0,
      }
    }

    // Calculate favorite hour
    const hourCounts: Record<number, number> = {}
    unlocks.forEach((unlock) => {
      hourCounts[unlock.unlockedAtHour] = (hourCounts[unlock.unlockedAtHour] || 0) + 1
    })

    const favoriteHour = Object.keys(hourCounts).reduce((a, b) =>
      hourCounts[Number(a)] > hourCounts[Number(b)] ? a : b,
    )

    // Calculate favorite time zones
    const timeZoneCounts: Record<string, number> = {}
    unlocks.forEach((unlock) => {
      unlock.timeZonesUsed.forEach((tz) => {
        timeZoneCounts[tz] = (timeZoneCounts[tz] || 0) + 1
      })
    })

    const favoriteTimeZones = Object.keys(timeZoneCounts)
      .sort((a, b) => timeZoneCounts[b] - timeZoneCounts[a])
      .slice(0, 5)

    const averageSessionDuration = Math.round(
      unlocks.reduce((sum, unlock) => sum + unlock.sessionDurationMinutes, 0) / unlocks.length,
    )

    return {
      totalUnlocks: unlocks.length,
      unlocks,
      favoriteHour: Number(favoriteHour),
      favoriteTimeZones,
      averageSessionDuration,
    }
  }
}
