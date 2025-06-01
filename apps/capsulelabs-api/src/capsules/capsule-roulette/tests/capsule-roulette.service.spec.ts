import { Test, type TestingModule } from "@nestjs/testing"
import { CapsuleRouletteService } from "../services/capsule-roulette.service"
import { RandomDropSchedulerService } from "../services/random-drop-scheduler.service"
import { ClaimGuardService } from "../services/claim-guard.service"
import { StrkRewardService } from "../services/strk-reward.service"
import { NotificationService } from "../services/notification.service"
import { RouletteAnalyticsService } from "../services/roulette-analytics.service"
import { DropStatus } from "../entities/capsule-roulette.entity"

describe("CapsuleRouletteService", () => {
  let service: CapsuleRouletteService
  let schedulerService: RandomDropSchedulerService
  let claimGuardService: ClaimGuardService
  let rewardService: StrkRewardService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapsuleRouletteService,
        {
          provide: RandomDropSchedulerService,
          useValue: {
            generateRandomDropTime: jest.fn(),
            scheduleDrop: jest.fn(),
            scheduleExpiration: jest.fn(),
            getNextScheduledDrop: jest.fn(),
          },
        },
        {
          provide: ClaimGuardService,
          useValue: {
            attemptClaim: jest.fn(),
            releaseLock: jest.fn(),
          },
        },
        {
          provide: StrkRewardService,
          useValue: {
            dispatchReward: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendDropNotifications: jest.fn(),
          },
        },
        {
          provide: RouletteAnalyticsService,
          useValue: {
            analyzeClaimRisk: jest.fn(),
            getUserWinsThisWeek: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<CapsuleRouletteService>(CapsuleRouletteService)
    schedulerService = module.get<RandomDropSchedulerService>(RandomDropSchedulerService)
    claimGuardService = module.get<ClaimGuardService>(ClaimGuardService)
    rewardService = module.get<StrkRewardService>(StrkRewardService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createRouletteDrop", () => {
    it("should create a new roulette drop", async () => {
      const createDto = {
        title: "Test Drop",
        description: "Test Description",
        createdBy: "user123",
      }

      jest.spyOn(schedulerService, "generateRandomDropTime").mockResolvedValue(new Date())
      jest.spyOn(schedulerService, "scheduleDrop").mockResolvedValue()

      const result = await service.createRouletteDrop(createDto)

      expect(result).toBeDefined()
      expect(result.title).toBe(createDto.title)
      expect(result.status).toBe(DropStatus.SCHEDULED)
      expect(schedulerService.generateRandomDropTime).toHaveBeenCalled()
      expect(schedulerService.scheduleDrop).toHaveBeenCalledWith(result)
    })

    it("should use provided scheduled time", async () => {
      const scheduledTime = new Date(Date.now() + 3600000) // 1 hour from now
      const createDto = {
        title: "Test Drop",
        description: "Test Description",
        scheduledDropTime: scheduledTime.toISOString(),
        createdBy: "user123",
      }

      jest.spyOn(schedulerService, "scheduleDrop").mockResolvedValue()

      const result = await service.createRouletteDrop(createDto)

      expect(result.scheduledDropTime).toEqual(scheduledTime)
      expect(schedulerService.generateRandomDropTime).not.toHaveBeenCalled()
    })
  })

  describe("claimCapsule", () => {
    let testDrop: any

    beforeEach(async () => {
      const createDto = {
        title: "Test Drop",
        description: "Test Description",
        createdBy: "user123",
      }

      jest.spyOn(schedulerService, "generateRandomDropTime").mockResolvedValue(new Date())
      jest.spyOn(schedulerService, "scheduleDrop").mockResolvedValue()

      testDrop = await service.createRouletteDrop(createDto)
      testDrop.status = DropStatus.DROPPED
      testDrop.actualDropTime = new Date()
    })

    it("should successfully claim a capsule", async () => {
      const claimDto = {
        capsuleDropId: testDrop.id,
        userId: "user456",
        userAgent: "test-agent",
        deviceFingerprint: "test-fingerprint",
      }

      jest.spyOn(claimGuardService, "attemptClaim").mockResolvedValue({
        success: true,
        message: "Lock acquired",
        lockId: "lock123",
      })

      jest.spyOn(rewardService, "dispatchReward").mockResolvedValue({
        success: true,
        transactionHash: "0x123",
        message: "Reward dispatched",
      })

      const result = await service.claimCapsule(claimDto)

      expect(result.success).toBe(true)
      expect(result.rewardAmount).toBeGreaterThan(0)
      expect(result.transactionHash).toBe("0x123")
      expect(testDrop.status).toBe(DropStatus.CLAIMED)
      expect(testDrop.claimedBy).toBe(claimDto.userId)
    })

    it("should fail when capsule is already claimed", async () => {
      testDrop.status = DropStatus.CLAIMED
      testDrop.claimedBy = "otherUser"

      const claimDto = {
        capsuleDropId: testDrop.id,
        userId: "user456",
      }

      const result = await service.claimCapsule(claimDto)

      expect(result.success).toBe(false)
      expect(result.message).toContain("already been claimed")
    })

    it("should fail when capsule is expired", async () => {
      testDrop.expiresAt = new Date(Date.now() - 1000) // Expired 1 second ago

      const claimDto = {
        capsuleDropId: testDrop.id,
        userId: "user456",
      }

      const result = await service.claimCapsule(claimDto)

      expect(result.success).toBe(false)
      expect(result.message).toContain("expired")
    })

    it("should fail when lock acquisition fails", async () => {
      const claimDto = {
        capsuleDropId: testDrop.id,
        userId: "user456",
      }

      jest.spyOn(claimGuardService, "attemptClaim").mockResolvedValue({
        success: false,
        message: "Lock acquisition failed",
        reason: "CONCURRENT_CLAIM" as any,
        code: "CONCURRENT_CLAIM",
      })

      const result = await service.claimCapsule(claimDto)

      expect(result.success).toBe(false)
      expect(result.message).toContain("Lock acquisition failed")
    })
  })

  describe("triggerManualDrop", () => {
    it("should create and immediately activate a manual drop", async () => {
      const manualDto = {
        title: "Manual Drop",
        description: "Emergency drop",
        triggeredBy: "admin123",
        durationMinutes: 30,
      }

      const result = await service.triggerManualDrop(manualDto)

      expect(result).toBeDefined()
      expect(result.title).toBe(manualDto.title)
      expect(result.status).toBe(DropStatus.DROPPED)
      expect(result.actualDropTime).toBeDefined()
      expect(result.createdBy).toBe(manualDto.triggeredBy)
    })
  })

  describe("performDrop", () => {
    it("should activate a scheduled drop", async () => {
      const createDto = {
        title: "Test Drop",
        description: "Test Description",
        createdBy: "user123",
      }

      jest.spyOn(schedulerService, "generateRandomDropTime").mockResolvedValue(new Date())
      jest.spyOn(schedulerService, "scheduleDrop").mockResolvedValue()
      jest.spyOn(schedulerService, "scheduleExpiration").mockResolvedValue()

      const drop = await service.createRouletteDrop(createDto)

      await service.performDrop(drop.id)

      const updatedDrop = service.getDrop(drop.id)
      expect(updatedDrop.status).toBe(DropStatus.DROPPED)
      expect(updatedDrop.actualDropTime).toBeDefined()
    })

    it("should not activate a drop that is not scheduled", async () => {
      const createDto = {
        title: "Test Drop",
        description: "Test Description",
        createdBy: "user123",
      }

      jest.spyOn(schedulerService, "generateRandomDropTime").mockResolvedValue(new Date())
      jest.spyOn(schedulerService, "scheduleDrop").mockResolvedValue()

      const drop = await service.createRouletteDrop(createDto)
      drop.status = DropStatus.\
