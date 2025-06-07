import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { SyncAttempt, SyncPulse, TimeSyncCapsuleUnlock, NTPSyncLog } from "../entities/timesync-capsule.entity"
import type { SyncAttemptDto, TimeSyncResponseDto } from "../dto/timesync.dto"
import type { TimeServerService } from "./time-server.service"
import type { PulseBroadcasterService } from "./pulse-broadcaster.service"
import type { NotificationService } from "./notification.service"

@Injectable()
export class SyncValidatorService {
  private readonly logger = new Logger(SyncValidatorService.name)

  constructor(
    private readonly syncAttemptRepository: Repository<SyncAttempt>,
    private readonly syncPulseRepository: Repository<SyncPulse>,
    private readonly unlockRepository: Repository<TimeSyncCapsuleUnlock>,
    private readonly ntpLogRepository: Repository<NTPSyncLog>,
    private readonly timeServerService: TimeServerService,
    private readonly pulseBroadcasterService: PulseBroadcasterService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Process a sync attempt from a user
   */
  async processSyncAttempt(userId: string, syncAttemptDto: SyncAttemptDto): Promise<TimeSyncResponseDto> {
    const serverTimestamp = this.timeServerService.getCurrentTime().serverTime

    // Get the pulse being synced to
    const pulse = await this.syncPulseRepository.findOne({
      where: { id: syncAttemptDto.pulseId },
    })

    if (!pulse) {
      throw new NotFoundException("Sync pulse not found")
    }

    // Calculate network latency
    const networkLatency =
      syncAttemptDto.networkLatency ||
      this.timeServerService.calculateNetworkLatency(syncAttemptDto.clientTimestamp, serverTimestamp)

    // Validate timing
    const validation = this.timeServerService.validateSyncTiming(
      syncAttemptDto.clientTimestamp,
      serverTimestamp,
      pulse.scheduledTime,
      pulse.windowStartMs + pulse.windowEndMs,
      networkLatency,
    )

    // Create sync attempt record
    const attempt = this.syncAttemptRepository.create({
      userId,
      pulseId: pulse.id,
      clientTimestamp: syncAttemptDto.clientTimestamp,
      serverTimestamp,
      pulseScheduledTime: pulse.scheduledTime,
      timeDifference: validation.timeDifference,
      allowedWindow: pulse.windowStartMs + pulse.windowEndMs,
      withinWindow: validation.withinWindow,
      wasSuccessful: validation.withinWindow,
      networkLatency,
      timeZone: syncAttemptDto.timeZone,
      deviceInfo: syncAttemptDto.deviceInfo,
    })

    await this.syncAttemptRepository.save(attempt)

    // Update pulse statistics
    await this.pulseBroadcasterService.updatePulseStatistics(pulse.id, validation.withinWindow)

    let capsuleUnlocked = false

    // Check if this unlocks the capsule
    if (validation.withinWindow) {
      capsuleUnlocked = await this.unlockCapsule(userId, pulse, attempt)
    }

    const response: TimeSyncResponseDto = {
      success: validation.withinWindow,
      timeDifference: validation.timeDifference,
      allowedWindow: pulse.windowStartMs + pulse.windowEndMs,
      withinWindow: validation.withinWindow,
      capsuleUnlocked,
      message: validation.withinWindow
        ? capsuleUnlocked
          ? "Perfect sync! Capsule unlocked!"
          : "Great sync! You're in perfect time."
        : `Sync missed by ${validation.adjustedDifference}ms. Try again next pulse!`,
    }

    this.logger.log(
      `Sync attempt by user ${userId}: ${validation.withinWindow ? "SUCCESS" : "FAILED"} (${validation.timeDifference}ms difference)`,
    )

    return response
  }

  /**
   * Unlock the capsule for a successful sync
   */
  private async unlockCapsule(userId: string, pulse: SyncPulse, attempt: SyncAttempt): Promise<boolean> {
    // Check if user already has the capsule unlocked
    const existingUnlock = await this.unlockRepository.findOne({
      where: { userId },
    })

    if (existingUnlock) {
      this.logger.log(`User ${userId} already has TimeSync capsule unlocked`)
      return false
    }

    // Get total attempts for this user
    const totalAttempts = await this.syncAttemptRepository.count({
      where: { userId },
    })

    // Create unlock record
    const unlock = this.unlockRepository.create({
      userId,
      pulseId: pulse.id,
      successfulAttemptId: attempt.id,
      unlockedAt: new Date(),
      totalAttempts,
      timingAccuracy: Math.abs(attempt.timeDifference),
      unlockDetails: {
        pulseScheduledTime: pulse.scheduledTime,
        clientTimestamp: attempt.clientTimestamp,
        serverTimestamp: attempt.serverTimestamp,
        timeDifference: attempt.timeDifference,
        networkLatency: attempt.networkLatency,
        ntpOffset: this.timeServerService.getNTPStatus().ntpOffset,
      },
    })

    await this.unlockRepository.save(unlock)

    // Send notification
    await this.notificationService.sendCapsuleUnlockedNotification(userId, attempt.timeDifference)

    this.logger.log(`🎉 TimeSync Capsule unlocked for user ${userId}!`)

    return true
  }

  /**
   * Log NTP synchronization attempt
   */
  async logNTPSync(
    userId: string,
    clientSentTime: Date,
    serverReceivedTime: Date,
    serverSentTime: Date,
    clientReceivedTime: Date,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const roundTripTime = clientReceivedTime.getTime() - clientSentTime.getTime()
    const clockOffset =
      (serverReceivedTime.getTime() -
        clientSentTime.getTime() +
        serverSentTime.getTime() -
        clientReceivedTime.getTime()) /
      2

    const ntpLog = this.ntpLogRepository.create({
      userId,
      clientSentTime,
      serverReceivedTime,
      serverSentTime,
      clientReceivedTime,
      roundTripTime,
      clockOffset,
      metadata,
    })

    await this.ntpLogRepository.save(ntpLog)

    this.logger.log(`NTP sync logged for user ${userId}: offset=${clockOffset}ms, rtt=${roundTripTime}ms`)
  }

  /**
   * Get user's sync history
   */
  async getUserSyncHistory(
    userId: string,
    limit = 20,
  ): Promise<{
    attempts: SyncAttempt[]
    unlock: TimeSyncCapsuleUnlock | null
    stats: {
      totalAttempts: number
      successfulAttempts: number
      successRate: number
      bestTiming: number | null
      averageTiming: number | null
    }
  }> {
    // Get attempts
    const attempts = await this.syncAttemptRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    })

    // Get unlock
    const unlock = await this.unlockRepository.findOne({
      where: { userId },
    })

    // Calculate stats
    const totalAttempts = attempts.length
    const successfulAttempts = attempts.filter((a) => a.wasSuccessful).length
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0

    const timingAccuracies = attempts.filter((a) => a.wasSuccessful).map((a) => Math.abs(a.timeDifference))

    const bestTiming = timingAccuracies.length > 0 ? Math.min(...timingAccuracies) : null
    const averageTiming =
      timingAccuracies.length > 0
        ? timingAccuracies.reduce((sum, timing) => sum + timing, 0) / timingAccuracies.length
        : null

    return {
      attempts,
      unlock,
      stats: {
        totalAttempts,
        successfulAttempts,
        successRate,
        bestTiming,
        averageTiming,
      },
    }
  }

  /**
   * Get global sync statistics
   */
  async getGlobalSyncStats(days = 7): Promise<{
    totalUsers: number
    totalAttempts: number
    successfulAttempts: number
    globalSuccessRate: number
    unlockedUsers: number
    averageTimingAccuracy: number
    recentPulses: SyncPulse[]
  }> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get recent attempts
    const attempts = await this.syncAttemptRepository.find({
      where: {
        createdAt: { $gte: startDate } as any,
      },
    })

    // Get recent pulses
    const recentPulses = await this.syncPulseRepository.find({
      where: {
        createdAt: { $gte: startDate } as any,
      },
      order: { createdAt: "DESC" },
      take: 10,
    })

    // Get unlocks
    const unlocks = await this.unlockRepository.find({
      where: {
        unlockedAt: { $gte: startDate } as any,
      },
    })

    const totalUsers = new Set(attempts.map((a) => a.userId)).size
    const totalAttempts = attempts.length
    const successfulAttempts = attempts.filter((a) => a.wasSuccessful).length
    const globalSuccessRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0
    const unlockedUsers = unlocks.length

    const timingAccuracies = attempts.filter((a) => a.wasSuccessful).map((a) => Math.abs(a.timeDifference))

    const averageTimingAccuracy =
      timingAccuracies.length > 0
        ? timingAccuracies.reduce((sum, timing) => sum + timing, 0) / timingAccuracies.length
        : 0

    return {
      totalUsers,
      totalAttempts,
      successfulAttempts,
      globalSuccessRate,
      unlockedUsers,
      averageTimingAccuracy,
      recentPulses,
    }
  }

  /**
   * Check if user has unlocked the capsule
   */
  async hasUserUnlockedCapsule(userId: string): Promise<boolean> {
    const unlock = await this.unlockRepository.findOne({
      where: { userId },
    })

    return !!unlock
  }

  /**
   * Get user's best sync attempt
   */
  async getUserBestSync(userId: string): Promise<SyncAttempt | null> {
    const bestAttempt = await this.syncAttemptRepository.findOne({
      where: {
        userId,
        wasSuccessful: true,
      },
      order: { timeDifference: "ASC" },
    })

    return bestAttempt
  }
}
