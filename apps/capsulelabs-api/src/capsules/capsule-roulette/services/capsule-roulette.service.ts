import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import type {
  RouletteCapsuleDrop,
  ClaimEvent,
  ClaimAttemptResult,
  UserRouletteStats,
  NextDropInfo,
} from "../entities/capsule-roulette.entity"
import { DropStatus, TransactionStatus, ClaimFailureReason } from "../entities/capsule-roulette.entity"
import type {
  CreateRouletteDropDto,
  ClaimCapsuleDto,
  UpdateRouletteDropDto,
  ManualDropDto,
} from "../dto/capsule-roulette.dto"
import type { RandomDropSchedulerService } from "./random-drop-scheduler.service"
import type { ClaimGuardService } from "./claim-guard.service"
import type { StrkRewardService } from "./strk-reward.service"
import type { NotificationService } from "./notification.service"
import type { RouletteAnalyticsService } from "./roulette-analytics.service"

@Injectable()
export class CapsuleRouletteService {
  private readonly logger = new Logger(CapsuleRouletteService.name)
  private drops = new Map<string, RouletteCapsuleDrop>()
  private claimEvents = new Map<string, ClaimEvent>()
  private userStats = new Map<string, UserRouletteStats>()
  private dropCounter = 0

  constructor(
    private readonly scheduler: RandomDropSchedulerService,
    private readonly claimGuard: ClaimGuardService,
    private readonly rewardService: StrkRewardService,
    private readonly notificationService: NotificationService,
    private readonly analytics: RouletteAnalyticsService,
  ) {}

  async createRouletteDrop(createDto: CreateRouletteDropDto): Promise<RouletteCapsuleDrop> {
    const dropId = this.generateDropId()
    this.dropCounter++

    // Generate random drop time if not specified
    const scheduledTime = createDto.scheduledDropTime
      ? new Date(createDto.scheduledDropTime)
      : await this.scheduler.generateRandomDropTime()

    // Set expiration time (24 hours after drop or custom duration)
    const expiresAt = new Date(scheduledTime)
    expiresAt.setHours(expiresAt.getHours() + 24)

    const drop: RouletteCapsuleDrop = {
      id: dropId,
      title: createDto.title,
      description: createDto.description,
      scheduledDropTime: scheduledTime,
      expiresAt,
      status: DropStatus.SCHEDULED,

      rewardConfig: createDto.rewardConfig || this.getDefaultRewardConfig(),
      eligibilityCriteria: createDto.eligibilityCriteria || this.getDefaultEligibilityCriteria(),
      eligibleUserIds: [],

      notificationsSent: 0,
      totalClaimAttempts: 0,
      uniqueClaimers: 0,

      createdAt: new Date(),
      createdBy: createDto.createdBy,
      dropNumber: this.dropCounter,
      specialEvent: createDto.specialEvent,
    }

    // Calculate eligible users
    drop.eligibleUserIds = await this.calculateEligibleUsers(drop.eligibilityCriteria)

    this.drops.set(dropId, drop)

    // Schedule the drop
    await this.scheduler.scheduleDrop(drop)

    this.logger.log(`Created roulette drop ${dropId} scheduled for ${scheduledTime.toISOString()}`)
    return drop
  }

  async claimCapsule(claimDto: ClaimCapsuleDto): Promise<ClaimAttemptResult> {
    const { capsuleDropId, userId, userAgent, deviceFingerprint } = claimDto
    const attemptTime = new Date()

    const drop = this.drops.get(capsuleDropId)
    if (!drop) {
      throw new NotFoundException(`Capsule drop with ID ${capsuleDropId} not found`)
    }

    // Create claim event record
    const claimEventId = this.generateClaimEventId()
    const claimEvent: ClaimEvent = {
      id: claimEventId,
      capsuleDropId,
      userId,
      attemptTime,
      success: false,
      claimLatency: 0,
      userAgent,
      deviceFingerprint,
      rewardCurrency: drop.rewardConfig.currency,
      transactionStatus: TransactionStatus.PENDING,
      suspiciousActivity: false,
      riskScore: 0,
      createdAt: new Date(),
    }

    // Update drop statistics
    drop.totalClaimAttempts++

    try {
      // Check if drop is available for claiming
      const availabilityCheck = this.checkDropAvailability(drop, attemptTime)
      if (!availabilityCheck.available) {
        claimEvent.success = false
        claimEvent.failureReason = availabilityCheck.reason
        claimEvent.errorCode = availabilityCheck.code
        this.claimEvents.set(claimEventId, claimEvent)

        return {
          success: false,
          message: availabilityCheck.message,
          claimEvent,
          nextDropInfo: await this.getNextDropInfo(userId),
        }
      }

      // Check user eligibility
      const eligibilityCheck = await this.checkUserEligibility(drop, userId)
      if (!eligibilityCheck.eligible) {
        claimEvent.success = false
        claimEvent.failureReason = ClaimFailureReason.NOT_ELIGIBLE
        claimEvent.errorCode = "USER_NOT_ELIGIBLE"
        this.claimEvents.set(claimEventId, claimEvent)

        return {
          success: false,
          message: eligibilityCheck.message,
          claimEvent,
          nextDropInfo: await this.getNextDropInfo(userId),
        }
      }

      // Attempt to acquire claim lock (atomic operation)
      const lockResult = await this.claimGuard.attemptClaim(capsuleDropId, userId, claimEvent)
      if (!lockResult.success) {
        claimEvent.success = false
        claimEvent.failureReason = lockResult.reason
        claimEvent.errorCode = lockResult.code
        this.claimEvents.set(claimEventId, claimEvent)

        return {
          success: false,
          message: lockResult.message,
          claimEvent,
          nextDropInfo: await this.getNextDropInfo(userId),
        }
      }

      // Calculate claim latency
      const dropTime = drop.actualDropTime || drop.scheduledDropTime
      claimEvent.claimLatency = attemptTime.getTime() - dropTime.getTime()

      // Perform risk analysis
      const riskAnalysis = await this.analytics.analyzeClaimRisk(claimEvent, drop)
      claimEvent.suspiciousActivity = riskAnalysis.suspicious
      claimEvent.riskScore = riskAnalysis.score

      if (riskAnalysis.suspicious && riskAnalysis.score > 0.8) {
        claimEvent.success = false
        claimEvent.failureReason = ClaimFailureReason.SUSPICIOUS_ACTIVITY
        claimEvent.errorCode = "HIGH_RISK_SCORE"
        this.claimEvents.set(claimEventId, claimEvent)

        // Release the lock
        await this.claimGuard.releaseLock(capsuleDropId)

        return {
          success: false,
          message: "Claim rejected due to suspicious activity",
          claimEvent,
        }
      }

      // Calculate reward amount
      const rewardAmount = this.calculateRewardAmount(drop, claimEvent, userId)
      claimEvent.rewardAmount = rewardAmount

      // Dispatch STRK reward
      const rewardResult = await this.rewardService.dispatchReward(userId, rewardAmount, claimEvent.id)
      if (!rewardResult.success) {
        claimEvent.success = false
        claimEvent.failureReason = ClaimFailureReason.SYSTEM_ERROR
        claimEvent.errorCode = "REWARD_DISPATCH_FAILED"
        claimEvent.transactionStatus = TransactionStatus.FAILED
        this.claimEvents.set(claimEventId, claimEvent)

        // Release the lock
        await this.claimGuard.releaseLock(capsuleDropId)

        return {
          success: false,
          message: "Failed to dispatch reward",
          claimEvent,
        }
      }

      // Success! Update all records
      claimEvent.success = true
      claimEvent.transactionHash = rewardResult.transactionHash
      claimEvent.transactionStatus = TransactionStatus.CONFIRMED

      // Update drop status
      drop.status = DropStatus.CLAIMED
      drop.claimedBy = userId
      drop.claimedAt = attemptTime
      drop.claimLatency = claimEvent.claimLatency

      // Update user statistics
      await this.updateUserStats(userId, claimEvent, true)

      // Track unique claimers
      if (!this.hasUserAttemptedClaim(capsuleDropId, userId)) {
        drop.uniqueClaimers++
      }

      this.claimEvents.set(claimEventId, claimEvent)

      this.logger.log(
        `User ${userId} successfully claimed capsule ${capsuleDropId} with ${claimEvent.claimLatency}ms latency`,
      )

      return {
        success: true,
        message: "Capsule claimed successfully!",
        claimEvent,
        rewardAmount,
        transactionHash: rewardResult.transactionHash,
        nextDropInfo: await this.getNextDropInfo(userId),
      }
    } catch (error) {
      this.logger.error(`Claim attempt failed for user ${userId}:`, error)

      claimEvent.success = false
      claimEvent.failureReason = ClaimFailureReason.SYSTEM_ERROR
      claimEvent.errorCode = "INTERNAL_ERROR"
      this.claimEvents.set(claimEventId, claimEvent)

      // Ensure lock is released
      await this.claimGuard.releaseLock(capsuleDropId)

      return {
        success: false,
        message: "An error occurred while processing your claim",
        claimEvent,
      }
    }
  }

  async triggerManualDrop(manualDto: ManualDropDto): Promise<RouletteCapsuleDrop> {
    const dropId = this.generateDropId()
    this.dropCounter++

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setMinutes(expiresAt.getMinutes() + (manualDto.durationMinutes || 60))

    const drop: RouletteCapsuleDrop = {
      id: dropId,
      title: manualDto.title,
      description: manualDto.description,
      scheduledDropTime: now,
      actualDropTime: now,
      expiresAt,
      status: DropStatus.DROPPED,

      rewardConfig: manualDto.rewardConfig || this.getDefaultRewardConfig(),
      eligibilityCriteria: this.getDefaultEligibilityCriteria(),
      eligibleUserIds: [],

      notificationsSent: 0,
      totalClaimAttempts: 0,
      uniqueClaimers: 0,

      createdAt: new Date(),
      createdBy: manualDto.triggeredBy,
      dropNumber: this.dropCounter,
    }

    // Calculate eligible users
    drop.eligibleUserIds = await this.calculateEligibleUsers(drop.eligibilityCriteria)

    this.drops.set(dropId, drop)

    // Send immediate notifications
    await this.notificationService.sendDropNotifications(drop)

    this.logger.log(`Manual drop ${dropId} triggered by ${manualDto.triggeredBy}`)
    return drop
  }

  async performDrop(dropId: string): Promise<void> {
    const drop = this.drops.get(dropId)
    if (!drop) {
      this.logger.error(`Attempted to perform drop for non-existent drop ${dropId}`)
      return
    }

    if (drop.status !== DropStatus.SCHEDULED) {
      this.logger.warn(`Attempted to perform drop ${dropId} with status ${drop.status}`)
      return
    }

    // Update drop status
    drop.status = DropStatus.DROPPED
    drop.actualDropTime = new Date()

    // Send notifications to eligible users
    await this.notificationService.sendDropNotifications(drop)

    // Schedule expiration
    await this.scheduler.scheduleExpiration(drop)

    this.logger.log(`Drop ${dropId} performed successfully, notified ${drop.eligibleUserIds.length} users`)
  }

  async expireDrop(dropId: string): Promise<void> {
    const drop = this.drops.get(dropId)
    if (!drop) {
      return
    }

    if (drop.status === DropStatus.DROPPED) {
      drop.status = DropStatus.EXPIRED
      this.logger.log(`Drop ${dropId} expired without being claimed`)
    }
  }

  getDrop(dropId: string): RouletteCapsuleDrop {
    const drop = this.drops.get(dropId)
    if (!drop) {
      throw new NotFoundException(`Drop with ID ${dropId} not found`)
    }
    return drop
  }

  getClaimEvent(claimEventId: string): ClaimEvent {
    const claimEvent = this.claimEvents.get(claimEventId)
    if (!claimEvent) {
      throw new NotFoundException(`Claim event with ID ${claimEventId} not found`)
    }
    return claimEvent
  }

  getUserStats(userId: string): UserRouletteStats {
    return this.userStats.get(userId) || this.initializeUserStats(userId)
  }

  updateDrop(dropId: string, updateDto: UpdateRouletteDropDto): RouletteCapsuleDrop {
    const drop = this.getDrop(dropId)

    if (updateDto.title !== undefined) drop.title = updateDto.title
    if (updateDto.description !== undefined) drop.description = updateDto.description
    if (updateDto.scheduledDropTime !== undefined) {
      drop.scheduledDropTime = new Date(updateDto.scheduledDropTime)
    }
    if (updateDto.rewardConfig !== undefined) {
      drop.rewardConfig = { ...drop.rewardConfig, ...updateDto.rewardConfig }
    }
    if (updateDto.eligibilityCriteria !== undefined) {
      drop.eligibilityCriteria = { ...drop.eligibilityCriteria, ...updateDto.eligibilityCriteria }
    }

    this.logger.log(`Updated drop ${dropId}`)
    return drop
  }

  deleteDrop(dropId: string): void {
    const drop = this.getDrop(dropId)
    this.drops.delete(dropId)
    this.logger.log(`Deleted drop ${dropId}`)
  }

  getAllDrops(filters?: {
    status?: string
    userId?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): RouletteCapsuleDrop[] {
    let drops = Array.from(this.drops.values())

    if (filters) {
      if (filters.status) {
        drops = drops.filter((d) => d.status === filters.status)
      }
      if (filters.userId) {
        drops = drops.filter((d) => d.eligibleUserIds.includes(filters.userId!))
      }
      if (filters.startDate) {
        drops = drops.filter((d) => d.scheduledDropTime >= filters.startDate!)
      }
      if (filters.endDate) {
        drops = drops.filter((d) => d.scheduledDropTime <= filters.endDate!)
      }

      // Pagination
      const offset = filters.offset || 0
      const limit = filters.limit || 50
      drops = drops.slice(offset, offset + limit)
    }

    return drops.sort((a, b) => b.scheduledDropTime.getTime() - a.scheduledDropTime.getTime())
  }

  getUserClaimHistory(userId: string): ClaimEvent[] {
    return Array.from(this.claimEvents.values())
      .filter((event) => event.userId === userId)
      .sort((a, b) => b.attemptTime.getTime() - a.attemptTime.getTime())
  }

  private checkDropAvailability(
    drop: RouletteCapsuleDrop,
    attemptTime: Date,
  ): { available: boolean; reason?: string; code?: string; message: string } {
    if (drop.status === DropStatus.CLAIMED) {
      return {
        available: false,
        reason: ClaimFailureReason.ALREADY_CLAIMED,
        code: "DROP_ALREADY_CLAIMED",
        message: "This capsule has already been claimed",
      }
    }

    if (drop.status === DropStatus.EXPIRED) {
      return {
        available: false,
        reason: ClaimFailureReason.EXPIRED,
        code: "DROP_EXPIRED",
        message: "This capsule has expired",
      }
    }

    if (drop.status !== DropStatus.DROPPED) {
      return {
        available: false,
        reason: ClaimFailureReason.NOT_DROPPED,
        code: "DROP_NOT_ACTIVE",
        message: "This capsule is not currently available for claiming",
      }
    }

    if (attemptTime > drop.expiresAt) {
      return {
        available: false,
        reason: ClaimFailureReason.EXPIRED,
        code: "DROP_EXPIRED",
        message: "This capsule has expired",
      }
    }

    return {
      available: true,
      message: "Drop is available for claiming",
    }
  }

  private async checkUserEligibility(
    drop: RouletteCapsuleDrop,
    userId: string,
  ): Promise<{ eligible: boolean; message: string; reasons?: string[] }> {
    const reasons: string[] = []

    // Check if user is in eligible list
    if (!drop.eligibleUserIds.includes(userId)) {
      reasons.push("User not in eligible list")
    }

    // Check if user already won recently
    const userStats = this.getUserStats(userId)
    if (drop.eligibilityCriteria.excludeRecentWinners && userStats.lastWinDate) {
      const daysSinceWin = Math.floor((Date.now() - userStats.lastWinDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceWin < drop.eligibilityCriteria.excludeRecentWinners) {
        reasons.push(`Must wait ${drop.eligibilityCriteria.excludeRecentWinners - daysSinceWin} more days`)
      }
    }

    // Check weekly win limit
    const thisWeekWins = await this.analytics.getUserWinsThisWeek(userId)
    if (thisWeekWins >= drop.eligibilityCriteria.maxWinsPerWeek) {
      reasons.push("Weekly win limit reached")
    }

    // Check if user already attempted this drop
    if (this.hasUserAttemptedClaim(drop.id, userId)) {
      const previousAttempt = Array.from(this.claimEvents.values()).find(
        (event) => event.capsuleDropId === drop.id && event.userId === userId,
      )
      if (previousAttempt?.success) {
        reasons.push("User already won this drop")
      }
    }

    const eligible = reasons.length === 0

    return {
      eligible,
      message: eligible ? "User is eligible" : reasons.join(", "),
      reasons: eligible ? undefined : reasons,
    }
  }

  private calculateRewardAmount(drop: RouletteCapsuleDrop, claimEvent: ClaimEvent, userId: string): number {
    const { rewardConfig } = drop
    let amount = rewardConfig.baseAmount

    // Apply speed multiplier (faster claims get bonus)
    const speedBonus = Math.max(0, 1 - claimEvent.claimLatency / 10000) // 10 second max bonus window
    amount *= 1 + speedBonus * rewardConfig.speedMultiplier

    // Apply streak multiplier
    const userStats = this.getUserStats(userId)
    amount *= 1 + userStats.currentStreak * rewardConfig.streakMultiplier

    // Apply special event multiplier
    if (drop.specialEvent) {
      amount *= drop.specialEvent.multiplier
    }

    // Apply time-based bonuses
    const claimTime = claimEvent.attemptTime
    const isWeekend = claimTime.getDay() === 0 || claimTime.getDay() === 6
    if (isWeekend && rewardConfig.weekendBonus > 0) {
      amount *= 1 + rewardConfig.weekendBonus
    }

    // Ensure within limits
    amount = Math.max(rewardConfig.minRewardAmount, Math.min(rewardConfig.maxRewardAmount, amount))

    return Math.floor(amount * 100) / 100 // Round to 2 decimal places
  }

  private async updateUserStats(userId: string, claimEvent: ClaimEvent, success: boolean): Promise<void> {
    let stats = this.userStats.get(userId)
    if (!stats) {
      stats = this.initializeUserStats(userId)
      this.userStats.set(userId, stats)
    }

    stats.totalAttempts++

    if (success) {
      stats.successfulClaims++
      stats.totalRewardsEarned += claimEvent.rewardAmount || 0
      stats.lastWinDate = claimEvent.attemptTime

      // Update streak
      const lastWin = stats.lastWinDate
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      if (lastWin && this.isSameDay(lastWin, yesterday)) {
        stats.currentStreak++
      } else {
        stats.currentStreak = 1
      }

      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak)
    }

    // Update averages
    const successfulClaims = Array.from(this.claimEvents.values()).filter(
      (event) => event.userId === userId && event.success,
    )

    if (successfulClaims.length > 0) {
      stats.averageClaimLatency =
        successfulClaims.reduce((sum, event) => sum + event.claimLatency, 0) / successfulClaims.length
    }

    stats.winRate = stats.totalAttempts > 0 ? stats.successfulClaims / stats.totalAttempts : 0

    // Update favorite claim time
    const claimHour = claimEvent.attemptTime.getHours()
    const claimMinute = claimEvent.attemptTime.getMinutes()
    stats.favoriteClaimTime = `${claimHour.toString().padStart(2, "0")}:${claimMinute.toString().padStart(2, "0")}`
  }

  private async getNextDropInfo(userId: string): Promise<NextDropInfo> {
    const nextDrop = await this.scheduler.getNextScheduledDrop()

    if (!nextDrop) {
      return {
        estimatedTimeRange: {
          earliest: new Date(),
          latest: new Date(),
        },
        eligibilityStatus: false,
        reasonsIneligible: ["No upcoming drops scheduled"],
      }
    }

    const eligibilityCheck = await this.checkUserEligibility(nextDrop, userId)

    return {
      estimatedTimeRange: {
        earliest: nextDrop.scheduledDropTime,
        latest: nextDrop.expiresAt,
      },
      eligibilityStatus: eligibilityCheck.eligible,
      reasonsIneligible: eligibilityCheck.reasons,
    }
  }

  private async calculateEligibleUsers(criteria: any): Promise<string[]> {
    // This would integrate with your user service to filter eligible users
    // For now, returning a mock list
    return ["user1", "user2", "user3", "user4", "user5"]
  }

  private hasUserAttemptedClaim(dropId: string, userId: string): boolean {
    return Array.from(this.claimEvents.values()).some(
      (event) => event.capsuleDropId === dropId && event.userId === userId,
    )
  }

  private initializeUserStats(userId: string): UserRouletteStats {
    return {
      userId,
      totalAttempts: 0,
      successfulClaims: 0,
      totalRewardsEarned: 0,
      averageClaimLatency: 0,
      currentStreak: 0,
      longestStreak: 0,
      winRate: 0,
      favoriteClaimTime: "12:00",
      riskScore: 0,
    }
  }

  private getDefaultRewardConfig() {
    return {
      baseAmount: 10,
      currency: "STRK",
      streakMultiplier: 0.1,
      speedMultiplier: 0.2,
      rarityMultiplier: 1.0,
      firstClaimBonus: 0.5,
      weekendBonus: 0.1,
      holidayBonus: 0.2,
      maxRewardAmount: 100,
      minRewardAmount: 1,
    }
  }

  private getDefaultEligibilityCriteria() {
    return {
      minimumAccountAge: 7,
      minimumActivity: 5,
      verificationRequired: false,
      premiumOnly: false,
      excludeBannedUsers: true,
      excludeRecentWinners: 1,
      maxWinsPerWeek: 3,
      mobileAppRequired: false,
      notificationEnabled: true,
    }
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  private generateDropId(): string {
    return `roulette_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateClaimEventId(): string {
    return `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
