import { Test, type TestingModule } from "@nestjs/testing"
import { ConfigService } from "@nestjs/config"
import { ReactionChallengeService } from "../reaction-challenge.service"
import { jest } from "@jest/globals"

describe("ReactionChallengeService", () => {
  let service: ReactionChallengeService
  let configService: ConfigService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionChallengeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              const config = {
                REACTION_MAX_ATTEMPTS: 3,
                REACTION_CHALLENGE_EXPIRY: 60000,
                REACTION_MIN_DELAY: 1000,
                REACTION_MAX_DELAY: 3000,
                REACTION_WINDOW: 300,
                REACTION_RETRY_DELAY: 2000,
              }
              return config[key] || defaultValue
            }),
          },
        },
      ],
    }).compile()

    service = module.get<ReactionChallengeService>(ReactionChallengeService)
    configService = module.get<ConfigService>(ConfigService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createChallenge", () => {
    it("should create a new challenge", () => {
      const userId = "test-user"
      const result = service.createChallenge(userId)

      expect(result).toHaveProperty("challengeId")
      expect(typeof result.challengeId).toBe("string")

      const challenge = service.getChallengeStatus(result.challengeId)
      expect(challenge).toBeDefined()
      expect(challenge?.userId).toBe(userId)
      expect(challenge?.status).toBe("pending")
      expect(challenge?.attempts).toBe(0)
    })
  })

  describe("generateTrigger", () => {
    it("should generate a trigger after a random delay", async () => {
      const userId = "test-user"
      const { challengeId } = service.createChallenge(userId)

      const delay = await service.generateTrigger(challengeId)
      expect(delay).toBeGreaterThanOrEqual(1000)
      expect(delay).toBeLessThanOrEqual(3000)

      // Wait for the trigger to be generated
      await new Promise((resolve) => setTimeout(resolve, delay + 100))

      const challenge = service.getChallengeStatus(challengeId)
      expect(challenge?.status).toBe("triggered")
      expect(challenge?.triggerTime).toBeGreaterThan(0)
    })

    it("should throw an error for non-existent challenge", async () => {
      await expect(service.generateTrigger("non-existent")).rejects.toThrow("Challenge not found")
    })
  })

  describe("processReaction", () => {
    it("should process a successful reaction", async () => {
      const userId = "test-user"
      const { challengeId } = service.createChallenge(userId)

      const delay = await service.generateTrigger(challengeId)

      // Wait for the trigger to be generated
      await new Promise((resolve) => setTimeout(resolve, delay + 100))

      const challenge = service.getChallengeStatus(challengeId)
      const triggerTime = challenge?.triggerTime || 0

      // Simulate a reaction within the window
      const reactionTime = triggerTime + 200
      const result = service.processReaction(challengeId, reactionTime)

      expect(result.success).toBe(true)
      expect(result.reactionTime).toBe(200)
    })

    it("should handle a reaction that is too slow", async () => {
      const userId = "test-user"
      const { challengeId } = service.createChallenge(userId)

      const delay = await service.generateTrigger(challengeId)

      // Wait for the trigger to be generated
      await new Promise((resolve) => setTimeout(resolve, delay + 100))

      const challenge = service.getChallengeStatus(challengeId)
      const triggerTime = challenge?.triggerTime || 0

      // Simulate a reaction outside the window
      const reactionTime = triggerTime + 400
      const result = service.processReaction(challengeId, reactionTime)

      expect(result.success).toBe(false)
      expect(result.reactionTime).toBe(400)
      expect(result.remainingAttempts).toBe(2)
    })

    it("should handle a reaction that is too early", async () => {
      const userId = "test-user"
      const { challengeId } = service.createChallenge(userId)

      const delay = await service.generateTrigger(challengeId)

      // Wait for a bit, but not for the full delay
      await new Promise((resolve) => setTimeout(resolve, delay / 2))

      // Simulate a reaction before the trigger
      const reactionTime = Date.now()
      const result = service.processReaction(challengeId, reactionTime)

      expect(result.success).toBe(false)
      expect(result.message).toContain("Too early")
    })
  })
})
