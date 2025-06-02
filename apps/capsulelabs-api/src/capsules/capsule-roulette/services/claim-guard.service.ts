import { Injectable, Logger } from "@nestjs/common"
import type { Cache } from "cache-manager"
import { Inject } from "@nestjs/common"
import { CACHE_MANAGER } from "@nestjs/cache-manager"
import type { ClaimEvent } from "../entities/capsule-roulette.entity"
import { ClaimFailureReason } from "../entities/capsule-roulette.entity"

interface ClaimLockResult {
  success: boolean
  reason?: ClaimFailureReason
  code?: string
  message: string
  lockId?: string
}

interface RateLimitInfo {
  attempts: number
  lastAttempt: Date
  windowStart: Date
}

@Injectable()
export class ClaimGuardService {
  private readonly logger = new Logger(ClaimGuardService.name)
  private readonly LOCK_TTL = 5000 // 5 seconds
  private readonly RATE_LIMIT_WINDOW = 60000 // 1 minute
  private readonly MAX_ATTEMPTS_PER_WINDOW = 3

  private activeLocks = new Map<string, { userId: string; timestamp: Date; lockId: string }>()
  private rateLimits = new Map<string, RateLimitInfo>();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async attemptClaim(capsuleDropId: string, userId: string, claimEvent: ClaimEvent): Promise<ClaimLockResult> {
    const lockKey = `capsule_claim_${capsuleDropId}`
    const userKey = `user_rate_limit_${userId}`

    try {
      // Check rate limiting first
      const rateLimitCheck = this.checkRateLimit(userId)
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          reason: ClaimFailureReason.RATE_LIMITED,
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many attempts. Try again in ${rateLimitCheck.retryAfter} seconds.`,
        }
      }

      // Update rate limit counter
      this.updateRateLimit(userId)

      // Attempt to acquire distributed lock using Redis
      const lockId = this.generateLockId()
      const lockAcquired = await this.acquireDistributedLock(lockKey, userId, lockId)

      if (!lockAcquired) {
        // Check if someone else has the lock
        const existingLock = await this.cacheManager.get(lockKey)
        if (existingLock) {
          return {
            success: false,
            reason: ClaimFailureReason.ALREADY_CLAIMED,
            code: "CONCURRENT_CLAIM",
            message: "Another user is currently claiming this capsule",
          }
        }

        return {
          success: false,
          reason: ClaimFailureReason.SYSTEM_ERROR,
          code: "LOCK_ACQUISITION_FAILED",
          message: "Failed to acquire claim lock",
        }
      }

      // Store local lock info
      this.activeLocks.set(lockKey, {
        userId,
        timestamp: new Date(),
        lockId,
      })

      // Set automatic lock release
      setTimeout(() => {
        this.releaseLock(capsuleDropId)
      }, this.LOCK_TTL)

      this.logger.log(`Claim lock acquired for user ${userId} on capsule ${capsuleDropId}`)

      return {
        success: true,
        message: "Claim lock acquired successfully",
        lockId,
      }
    } catch (error) {
      this.logger.error(`Failed to acquire claim lock for user ${userId}:`, error)

      return {
        success: false,
        reason: ClaimFailureReason.SYSTEM_ERROR,
        code: "LOCK_ERROR",
        message: "System error during claim processing",
      }
    }
  }

  async releaseLock(capsuleDropId: string): Promise<void> {
    const lockKey = `capsule_claim_${capsuleDropId}`

    try {
      // Remove from local storage
      const lockInfo = this.activeLocks.get(lockKey)
      if (lockInfo) {
        this.activeLocks.delete(lockKey)

        // Remove from Redis
        await this.releaseDistributedLock(lockKey, lockInfo.lockId)

        this.logger.log(`Released claim lock for capsule ${capsuleDropId}`)
      }
    } catch (error) {
      this.logger.error(`Failed to release lock for capsule ${capsuleDropId}:`, error)
    }
  }

  async isLocked(capsuleDropId: string): Promise<boolean> {
    const lockKey = `capsule_claim_${capsuleDropId}`
    const distributedLock = await this.cacheManager.get(lockKey)
    const localLock = this.activeLocks.has(lockKey)

    return !!(distributedLock || localLock)
  }

  async getLockInfo(capsuleDropId: string): Promise<{ userId: string; timestamp: Date } | null> {
    const lockKey = `capsule_claim_${capsuleDropId}`
    const localLock = this.activeLocks.get(lockKey)

    if (localLock) {
      return {
        userId: localLock.userId,
        timestamp: localLock.timestamp,
      }
    }

    // Check distributed lock
    const distributedLock = await this.cacheManager.get(lockKey)
    if (distributedLock && typeof distributedLock === "object") {
      return distributedLock as { userId: string; timestamp: Date }
    }

    return null
  }

  getUserRateLimit(userId: string): RateLimitInfo | null {
    return this.rateLimits.get(`user_rate_limit_${userId}`) || null
  }

  async cleanupExpiredLocks(): Promise<void> {
    const now = new Date()
    const expiredLocks: string[] = []

    // Check local locks
    for (const [lockKey, lockInfo] of this.activeLocks.entries()) {
      const lockAge = now.getTime() - lockInfo.timestamp.getTime()
      if (lockAge > this.LOCK_TTL) {
        expiredLocks.push(lockKey)
      }
    }

    // Clean up expired locks
    for (const lockKey of expiredLocks) {
      const lockInfo = this.activeLocks.get(lockKey)
      if (lockInfo) {
        await this.releaseDistributedLock(lockKey, lockInfo.lockId)
        this.activeLocks.delete(lockKey)
        this.logger.log(`Cleaned up expired lock: ${lockKey}`)
      }
    }

    // Clean up old rate limit entries
    this.cleanupRateLimits()
  }

  private async acquireDistributedLock(lockKey: string, userId: string, lockId: string): Promise<boolean> {
    try {
      // Use Redis SET with NX (only if not exists) and PX (expiration in milliseconds)
      const lockValue = JSON.stringify({
        userId,
        timestamp: new Date(),
        lockId,
      })

      // This simulates Redis SET lockKey lockValue PX ttl NX
      const existing = await this.cacheManager.get(lockKey)
      if (existing) {
        return false // Lock already exists
      }

      await this.cacheManager.set(lockKey, lockValue, this.LOCK_TTL)
      return true
    } catch (error) {
      this.logger.error(`Failed to acquire distributed lock ${lockKey}:`, error)
      return false
    }
  }

  private async releaseDistributedLock(lockKey: string, lockId: string): Promise<void> {
    try {
      // Verify we own the lock before releasing
      const lockValue = await this.cacheManager.get(lockKey)
      if (lockValue && typeof lockValue === "string") {
        const lockData = JSON.parse(lockValue)
        if (lockData.lockId === lockId) {
          await this.cacheManager.del(lockKey)
        }
      }
    } catch (error) {
      this.logger.error(`Failed to release distributed lock ${lockKey}:`, error)
    }
  }

  private checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
    const userKey = `user_rate_limit_${userId}`
    const rateLimitInfo = this.rateLimits.get(userKey)

    if (!rateLimitInfo) {
      return { allowed: true }
    }

    const now = new Date()
    const windowAge = now.getTime() - rateLimitInfo.windowStart.getTime()

    // Reset window if expired
    if (windowAge > this.RATE_LIMIT_WINDOW) {
      this.rateLimits.delete(userKey)
      return { allowed: true }
    }

    // Check if limit exceeded
    if (rateLimitInfo.attempts >= this.MAX_ATTEMPTS_PER_WINDOW) {
      const retryAfter = Math.ceil((this.RATE_LIMIT_WINDOW - windowAge) / 1000)
      return { allowed: false, retryAfter }
    }

    return { allowed: true }
  }

  private updateRateLimit(userId: string): void {
    const userKey = `user_rate_limit_${userId}`
    const now = new Date()
    const existing = this.rateLimits.get(userKey)

    if (!existing) {
      this.rateLimits.set(userKey, {
        attempts: 1,
        lastAttempt: now,
        windowStart: now,
      })
    } else {
      const windowAge = now.getTime() - existing.windowStart.getTime()

      if (windowAge > this.RATE_LIMIT_WINDOW) {
        // Start new window
        this.rateLimits.set(userKey, {
          attempts: 1,
          lastAttempt: now,
          windowStart: now,
        })
      } else {
        // Increment in current window
        existing.attempts++
        existing.lastAttempt = now
      }
    }
  }

  private cleanupRateLimits(): void {
    const now = new Date()
    const expiredKeys: string[] = []

    for (const [key, info] of this.rateLimits.entries()) {
      const age = now.getTime() - info.windowStart.getTime()
      if (age > this.RATE_LIMIT_WINDOW * 2) {
        // Keep for 2x window duration
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.rateLimits.delete(key)
    }
  }

  private generateLockId(): string {
    return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
