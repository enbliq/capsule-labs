import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { MoodCapsule, CapsuleStatus } from "../entities/mood-capsule.entity"
import type { MoodService } from "./mood.service"
import type { CreateCapsuleDto } from "../dto/create-capsule.dto"

@Injectable()
export class CapsuleService {
  private readonly logger = new Logger(CapsuleService.name);

  constructor(
    private readonly moodService: MoodService,
    @InjectRepository(MoodCapsule)
    private readonly capsuleRepository: Repository<MoodCapsule>,
  ) {}

  async createCapsule(createCapsuleDto: CreateCapsuleDto): Promise<MoodCapsule> {
    const capsule = this.capsuleRepository.create(createCapsuleDto)
    return this.capsuleRepository.save(capsule)
  }

  async getUserCapsules(userId: string): Promise<MoodCapsule[]> {
    return this.capsuleRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    })
  }

  async getCapsuleById(id: string, userId: string): Promise<MoodCapsule> {
    const capsule = await this.capsuleRepository.findOne({
      where: { id, userId },
    })

    if (!capsule) {
      throw new NotFoundException("Capsule not found")
    }

    return capsule
  }

  async checkAndUnlockCapsules(userId: string): Promise<{
    checkedCapsules: number
    unlockedCapsules: MoodCapsule[]
  }> {
    const lockedCapsules = await this.capsuleRepository.find({
      where: {
        userId,
        status: CapsuleStatus.LOCKED,
      },
    })

    const unlockedCapsules: MoodCapsule[] = []

    for (const capsule of lockedCapsules) {
      const consistencyResult = await this.moodService.checkMoodConsistency(
        userId,
        capsule.requiredDays,
        capsule.unlockThreshold,
      )

      if (consistencyResult.isConsistent) {
        capsule.status = CapsuleStatus.UNLOCKED
        capsule.unlockedAt = new Date()
        capsule.unlockCriteria = {
          consistencyScore: consistencyResult.consistencyScore,
          daysCovered: consistencyResult.daysCovered,
          averageSentiment: consistencyResult.averageSentiment,
          sentimentVariance: consistencyResult.sentimentVariance,
          unlockedAt: new Date().toISOString(),
        }

        await this.capsuleRepository.save(capsule)
        unlockedCapsules.push(capsule)

        this.logger.log(`Capsule ${capsule.id} unlocked for user ${userId}`)
      }
    }

    return {
      checkedCapsules: lockedCapsules.length,
      unlockedCapsules,
    }
  }

  async openCapsule(id: string, userId: string): Promise<MoodCapsule> {
    const capsule = await this.getCapsuleById(id, userId)

    if (capsule.status !== CapsuleStatus.UNLOCKED) {
      throw new Error("Capsule is not unlocked yet")
    }

    capsule.status = CapsuleStatus.OPENED
    capsule.openedAt = new Date()

    return this.capsuleRepository.save(capsule)
  }

  async getCapsuleStats(userId: string): Promise<{
    total: number
    locked: number
    unlocked: number
    opened: number
  }> {
    const capsules = await this.getUserCapsules(userId)

    return {
      total: capsules.length,
      locked: capsules.filter((c) => c.status === CapsuleStatus.LOCKED).length,
      unlocked: capsules.filter((c) => c.status === CapsuleStatus.UNLOCKED).length,
      opened: capsules.filter((c) => c.status === CapsuleStatus.OPENED).length,
    }
  }
}
