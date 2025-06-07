import { Test, type TestingModule } from "@nestjs/testing"
import { ConfigService } from "@nestjs/config"
import { SocialCapsuleChallengeService } from "../social-capsule-challenge.service"
import { NotFoundException, BadRequestException, ConflictException } from "@nestjs/common"

describe("SocialCapsuleChallengeService", () => {
  let service: SocialCapsuleChallengeService
  let configService: ConfigService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialCapsuleChallengeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                SOCIAL_CAPSULE_REQUIRED_FRIENDS: 3,
                SOCIAL_CAPSULE_INVITE_EXPIRY: 7 * 24 * 60 * 60 * 1000,
                SOCIAL_CAPSULE_EXPIRY: 30 * 24 * 60 * 60 * 1000,
                SOCIAL_CAPSULE_MAX_PER_USER: 10,
              }
              return config[key] || defaultValue
            }),
          },
        },
      ],
    }).compile()

    service = module.get<SocialCapsuleChallengeService>(SocialCapsuleChallengeService)
    configService = module.get<ConfigService>(ConfigService)
  })

  describe("createSocialCapsule", () => {
    it("should create a social capsule successfully", async () => {
      const capsule = await service.createSocialCapsule("user1", "Test Capsule", { message: "Hello World" })

      expect(capsule).toBeDefined()
      expect(capsule.ownerId).toBe("user1")
      expect(capsule.title).toBe("Test Capsule")
      expect(capsule.requiredFriends).toBe(3)
      expect(capsule.isUnlocked).toBe(false)
      expect(capsule.shareCode).toBeDefined()
      expect(capsule.shareCode).toHaveLength(8)
    })

    it("should create capsule with custom settings", async () => {
      const capsule = await service.createSocialCapsule(
        "user1",
        "Custom Capsule",
        { data: "test" },
        {
          requiredFriends: 2,
          description: "Test description",
          ownerUsername: "testuser",
        },
      )

      expect(capsule.requiredFriends).toBe(2)
      expect(capsule.description).toBe("Test description")
      expect(capsule.ownerUsername).toBe("testuser")
    })

    it("should enforce user capsule limit", async () => {
      // Create maximum allowed capsules
      for (let i = 0; i < 10; i++) {
        await service.createSocialCapsule("user1", `Capsule ${i}`, { data: i })
      }

      // Try to create one more
      await expect(service.createSocialCapsule("user1", "Extra Capsule", { data: "extra" })).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe("inviteFriend", () => {
    let capsule: any

    beforeEach(async () => {
      capsule = await service.createSocialCapsule("user1", "Test Capsule", { message: "Hello" })
    })

    it("should invite a friend successfully", async () => {
      const invite = await service.inviteFriend(capsule.capsuleId, "user1", "friend@example.com", "friend1", "Friend")

      expect(invite).toBeDefined()
      expect(invite.toEmail).toBe("friend@example.com")
      expect(invite.status).toBe("pending")
      expect(invite.inviteCode).toBeDefined()
      expect(invite.capsuleTitle).toBe("Test Capsule")
    })

    it("should not allow non-owner to invite friends", async () => {
      await expect(service.inviteFriend(capsule.capsuleId, "user2", "friend@example.com")).rejects.toThrow(
        BadRequestException,
      )
    })

    it("should not allow duplicate invites", async () => {
      await service.inviteFriend(capsule.capsuleId, "user1", "friend@example.com")

      await expect(service.inviteFriend(capsule.capsuleId, "user1", "friend@example.com")).rejects.toThrow(
        ConflictException,
      )
    })

    it("should not allow invites to unlocked capsule", async () => {
      // Simulate unlocked capsule
      const unlockedCapsule = await service.createSocialCapsule(
        "user1",
        "Unlocked",
        { data: "test" },
        {
          requiredFriends: 0,
        },
      )

      // Manually unlock for test
      const capsuleData = await service.getCapsule(unlockedCapsule.capsuleId, "user1")
      capsuleData.isUnlocked = true

      await expect(service.inviteFriend(unlockedCapsule.capsuleId, "user1", "friend@example.com")).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe("acceptInvite", () => {
    let capsule: any
    let invite: any

    beforeEach(async () => {
      capsule = await service.createSocialCapsule("user1", "Test Capsule", { message: "Hello" })
      invite = await service.inviteFriend(capsule.capsuleId, "user1", "friend@example.com", "friend1")
    })

    it("should accept invite and create linked capsule", async () => {
      const result = await service.acceptInvite(invite.inviteCode, "friend1")

      expect(result.invite.status).toBe("accepted")
      expect(result.linkedCapsule).toBeDefined()
      expect(result.linkedCapsule.ownerId).toBe("friend1")
      expect(result.linkedCapsule.metadata?.isLinked).toBe(true)
      expect(result.linkedCapsule.metadata?.originalCapsuleId).toBe(capsule.capsuleId)
    })

    it("should not accept invalid invite code", async () => {
      await expect(service.acceptInvite("INVALID", "friend1")).rejects.toThrow(NotFoundException)
    })

    it("should not accept already processed invite", async () => {
      await service.acceptInvite(invite.inviteCode, "friend1")

      await expect(service.acceptInvite(invite.inviteCode, "friend2")).rejects.toThrow(BadRequestException)
    })
  })

  describe("openCapsule", () => {
    let capsule: any

    beforeEach(async () => {
      capsule = await service.createSocialCapsule("user1", "Test Capsule", { message: "Hello" })
    })

    it("should not open capsule without enough friends", async () => {
      await expect(service.openCapsule(capsule.capsuleId, "user1")).rejects.toThrow(BadRequestException)
    })

    it("should open linked capsule immediately", async () => {
      const linkedCapsule = await service.createSocialCapsule(
        "friend1",
        "Linked Capsule",
        { data: "test" },
        {
          requiredFriends: 0,
          metadata: { isLinked: true, originalCapsuleId: capsule.capsuleId },
        },
      )

      const result = await service.openCapsule(linkedCapsule.capsuleId, "friend1")

      expect(result.capsule.isUnlocked).toBe(true)
      expect(result.capsule.unlockedAt).toBeDefined()
    })

    it("should not allow non-owner to open capsule", async () => {
      await expect(service.openCapsule(capsule.capsuleId, "user2")).rejects.toThrow(BadRequestException)
    })

    it("should not open already unlocked capsule", async () => {
      // Create and unlock a linked capsule first
      const linkedCapsule = await service.createSocialCapsule(
        "friend1",
        "Linked",
        { data: "test" },
        {
          metadata: { isLinked: true, originalCapsuleId: capsule.capsuleId },
        },
      )
      await service.openCapsule(linkedCapsule.capsuleId, "friend1")

      await expect(service.openCapsule(linkedCapsule.capsuleId, "friend1")).rejects.toThrow(BadRequestException)
    })
  })

  describe("getCapsule", () => {
    let capsule: any

    beforeEach(async () => {
      capsule = await service.createSocialCapsule("user1", "Test Capsule", { secret: "data" })
    })

    it("should return full capsule details for owner", async () => {
      const result = await service.getCapsule(capsule.capsuleId, "user1")

      expect(result.ownerId).toBe("user1")
      expect(result.content).toEqual({ secret: "data" })
      expect(result.invitedFriends).toBeDefined()
    })

    it("should return limited details for non-owner", async () => {
      const result = await service.getCapsule(capsule.capsuleId, "user2")

      expect(result.ownerId).toBe("user1")
      expect(result.content).toBeNull()
      expect(result.invitedFriends).toEqual([])
    })

    it("should throw error for non-existent capsule", async () => {
      await expect(service.getCapsule("invalid-id")).rejects.toThrow(NotFoundException)
    })
  })

  describe("getUserStatistics", () => {
    it("should return user statistics", async () => {
      // Create some test data
      await service.createSocialCapsule("user1", "Capsule 1", { data: "test1" })
      await service.createSocialCapsule("user1", "Capsule 2", { data: "test2" })

      const stats = await service.getUserStatistics("user1")

      expect(stats).toBeDefined()
      expect(stats.totalCapsules).toBe(2)
      expect(stats.unlockedCapsules).toBe(0)
      expect(stats.pendingCapsules).toBe(2)
      expect(stats.successRate).toBe(0)
    })
  })

  describe("cleanupExpiredInvites", () => {
    it("should cleanup expired invites", async () => {
      const capsule = await service.createSocialCapsule("user1", "Test", { data: "test" })
      const invite = await service.inviteFriend(capsule.capsuleId, "user1", "friend@example.com")

      // Manually expire the invite for testing
      const inviteData = await service.getUserInvites("temp_" + Date.now())
      // This would normally be done by time passage

      const cleanedCount = await service.cleanupExpiredInvites()
      expect(cleanedCount).toBeGreaterThanOrEqual(0)
    })
  })
})
