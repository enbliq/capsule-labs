import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { v4 as uuidv4 } from "uuid"

export interface Challenge {
  id: string
  userId: string
  triggerTime: number
  status: "pending" | "triggered" | "success" | "failed"
  attempts: number
  maxAttempts: number
  createdAt: number
  expiresAt: number
  triggerType: "sound" | "visual"
}

export interface ChallengeResult {
  success: boolean
  reactionTime?: number
  message: string
  remainingAttempts?: number
  nextAttemptAvailableAt?: number
}

@Injectable()
export class ReactionChallengeService {
  private readonly logger = new Logger(ReactionChallengeService.name)
  private readonly challenges = new Map<string, Challenge>()

  // Configuration defaults
  private readonly defaultMaxAttempts: number = 5
  private readonly defaultChallengeExpiry: number = 60000 // 1 minute
  private readonly defaultMinDelay: number = 1000 // 1 second
  private readonly defaultMaxDelay: number = 5000 // 5 seconds
  private readonly defaultReactionWindow: number = 300 // 0.3 seconds
  private readonly defaultRetryDelay: number = 2000 // 2 seconds

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create a new reaction challenge for a user
   */
  createChallenge(userId: string, triggerType: "sound" | "visual" = "visual"): { challengeId: string } {
    // Clean up expired challenges
    this.cleanupExpiredChallenges()

    const maxAttempts = this.configService.get<number>("REACTION_MAX_ATTEMPTS", this.defaultMaxAttempts)
    const challengeExpiry = this.configService.get<number>("REACTION_CHALLENGE_EXPIRY", this.defaultChallengeExpiry)

    const challengeId = uuidv4()
    const now = Date.now()

    const challenge: Challenge = {
      id: challengeId,
      userId,
      triggerTime: 0, // Will be set when trigger is generated
      status: "pending",
      attempts: 0,
      maxAttempts,
      createdAt: now,
      expiresAt: now + challengeExpiry,
      triggerType,
    }

    this.challenges.set(challengeId, challenge)
    this.logger.log(`Created challenge ${challengeId} for user ${userId}`)

    return { challengeId }
  }

  /**
   * Generate a trigger for a challenge after a random delay
   * Returns the delay in milliseconds
   */
  async generateTrigger(challengeId: string): Promise<number> {
    const challenge = this.challenges.get(challengeId)

    if (!challenge) {
      throw new Error("Challenge not found")
    }

    if (challenge.status !== "pending") {
      throw new Error(`Challenge is already in ${challenge.status} state`)
    }

    const minDelay = this.configService.get<number>("REACTION_MIN_DELAY", this.defaultMinDelay)
    const maxDelay = this.configService.get<number>("REACTION_MAX_DELAY", this.defaultMaxDelay)

    // Generate random delay between min and max
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay

    // Update challenge with trigger time after delay
    setTimeout(() => {
      const now = Date.now()
      challenge.triggerTime = now
      challenge.status = "triggered"
      this.challenges.set(challengeId, challenge)
      this.logger.log(`Triggered challenge ${challengeId} at ${now}`)
    }, delay)

    return delay
  }

  /**
   * Process user's reaction to a trigger
   */
  processReaction(challengeId: string, reactionTime: number): ChallengeResult {
    const challenge = this.challenges.get(challengeId)

    if (!challenge) {
      return {
        success: false,
        message: "Challenge not found",
      }
    }

    if (challenge.status === "pending") {
      return {
        success: false,
        message: "Challenge has not been triggered yet",
      }
    }

    if (challenge.status === "success") {
      return {
        success: true,
        message: "Challenge already completed successfully",
      }
    }

    if (challenge.expiresAt < Date.now()) {
      this.challenges.delete(challengeId)
      return {
        success: false,
        message: "Challenge has expired",
      }
    }

    // Increment attempt counter
    challenge.attempts += 1

    const reactionWindow = this.configService.get<number>("REACTION_WINDOW", this.defaultReactionWindow)
    const actualReactionTime = reactionTime - challenge.triggerTime

    // Check if reaction was within the window
    if (actualReactionTime >= 0 && actualReactionTime <= reactionWindow) {
      challenge.status = "success"
      this.challenges.set(challengeId, challenge)

      return {
        success: true,
        reactionTime: actualReactionTime,
        message: `Success! Reacted in ${actualReactionTime}ms`,
      }
    }

    // Handle failure
    const remainingAttempts = challenge.maxAttempts - challenge.attempts

    if (remainingAttempts <= 0) {
      challenge.status = "failed"
      this.challenges.set(challengeId, challenge)

      return {
        success: false,
        reactionTime: actualReactionTime,
        message: "Challenge failed: maximum attempts reached",
        remainingAttempts: 0,
      }
    }

    // Calculate next attempt availability
    const retryDelay = this.configService.get<number>("REACTION_RETRY_DELAY", this.defaultRetryDelay)
    const nextAttemptAvailableAt = Date.now() + retryDelay

    challenge.status = "pending"
    this.challenges.set(challengeId, challenge)

    return {
      success: false,
      reactionTime: actualReactionTime,
      message:
        actualReactionTime < 0
          ? "Too early! Reacted before trigger"
          : `Too slow! Reacted ${actualReactionTime}ms after trigger (limit: ${reactionWindow}ms)`,
      remainingAttempts,
      nextAttemptAvailableAt,
    }
  }

  /**
   * Get the current status of a challenge
   */
  getChallengeStatus(challengeId: string): Challenge | null {
    const challenge = this.challenges.get(challengeId)
    return challenge ? { ...challenge } : null
  }

  /**
   * Clean up expired challenges
   */
  private cleanupExpiredChallenges(): void {
    const now = Date.now()
    let expiredCount = 0

    for (const [id, challenge] of this.challenges.entries()) {
      if (challenge.expiresAt < now) {
        this.challenges.delete(id)
        expiredCount++
      }
    }

    if (expiredCount > 0) {
      this.logger.debug(`Cleaned up ${expiredCount} expired challenges`)
    }
  }
}
