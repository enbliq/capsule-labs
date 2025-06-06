import { Injectable, NotFoundException, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { StarTimeCapsule } from "../entities/star-time-capsule.entity"
import type { CreateAstronomyCapsuleDto } from "../dto/create-astronomy-capsule.dto"
import type { CheckAstronomyUnlockDto } from "../dto/check-astronomy-unlock.dto"
import type { AstronomyService } from "./astronomy.service"

interface UnlockResult {
  capsuleId: string
  unlocked: boolean
  message: string
  unlockedAt?: Date
}

interface CheckResult {
  totalChecked: number
  newlyUnlocked: number
  results: UnlockResult[]
}

@Injectable()
export class StarTimeCapsuleService {
  private readonly logger = new Logger(StarTimeCapsuleService.name)

  constructor(
    private readonly capsuleRepository: Repository<StarTimeCapsule>,
    private readonly astronomyService: AstronomyService,
  ) {}

  /**
   * Create a new star time capsule
   */
  async create(createDto: CreateAstronomyCapsuleDto): Promise<StarTimeCapsule> {
    const expectedDate = new Date(createDto.expectedDate)

    // Validate that the expected date is in the future
    if (expectedDate <= new Date()) {
      throw new Error("Expected date must be in the future")
    }

    const capsule = this.capsuleRepository.create({
      eventType: createDto.eventType,
      expectedDate,
      title: createDto.title,
      content: createDto.content,
      createdBy: createDto.createdBy,
      unlocked: false,
      unlockedAt: null,
    })

    const savedCapsule = await this.capsuleRepository.save(capsule)
    this.logger.log(`Created new star time capsule: ${savedCapsule.id}`)

    return savedCapsule
  }

  /**
   * Check and unlock capsules based on astronomical events
   */
  async checkUnlock(checkDto: CheckAstronomyUnlockDto): Promise<CheckResult> {
    let capsules: StarTimeCapsule[]

    if (checkDto.capsuleId) {
      // Check specific capsule
      const capsule = await this.capsuleRepository.findOne({
        where: { id: checkDto.capsuleId },
      })

      if (!capsule) {
        throw new NotFoundException(`Capsule with ID ${checkDto.capsuleId} not found`)
      }

      capsules = [capsule]
    } else {
      // Check all unlocked capsules, optionally filtered by event type
      const whereCondition: any = { unlocked: false }

      if (checkDto.eventType) {
        whereCondition.eventType = checkDto.eventType
      }

      capsules = await this.capsuleRepository.find({
        where: whereCondition,
        order: { expectedDate: "ASC" },
      })
    }

    const results: UnlockResult[] = []
    let newlyUnlocked = 0

    for (const capsule of capsules) {
      const unlockResult = await this.checkSingleCapsule(capsule)
      results.push(unlockResult)

      if (unlockResult.unlocked && unlockResult.unlockedAt) {
        newlyUnlocked++
      }
    }

    this.logger.log(`Checked ${capsules.length} capsules, ${newlyUnlocked} newly unlocked`)

    return {
      totalChecked: capsules.length,
      newlyUnlocked,
      results,
    }
  }

  /**
   * Get all capsules for a user
   */
  async findAll(createdBy?: string): Promise<StarTimeCapsule[]> {
    const whereCondition = createdBy ? { createdBy } : {}

    return this.capsuleRepository.find({
      where: whereCondition,
      order: { createdAt: "DESC" },
    })
  }

  /**
   * Get a specific capsule by ID
   */
  async findOne(id: string): Promise<StarTimeCapsule> {
    const capsule = await this.capsuleRepository.findOne({
      where: { id },
    })

    if (!capsule) {
      throw new NotFoundException(`Capsule with ID ${id} not found`)
    }

    return capsule
  }

  /**
   * Get upcoming astronomical events
   */
  async getUpcomingEvents(months = 12) {
    return this.astronomyService.getUpcomingEvents(months)
  }

  /**
   * Suggest next event date for a given event type
   */
  async suggestNextEventDate(eventType: string) {
    try {
      const nextDate = await this.astronomyService.getNextEventDate(eventType as any)
      return {
        eventType,
        suggestedDate: nextDate,
        message: `Next ${eventType.replace("_", " ")} is expected on ${nextDate.toISOString()}`,
      }
    } catch (error) {
      this.logger.error(`Failed to suggest date for ${eventType}: ${error.message}`)
      throw new Error(`Unable to calculate next ${eventType} date`)
    }
  }

  private async checkSingleCapsule(capsule: StarTimeCapsule): Promise<UnlockResult> {
    if (capsule.unlocked) {
      return {
        capsuleId: capsule.id,
        unlocked: true,
        message: "Capsule was already unlocked",
        unlockedAt: capsule.unlockedAt,
      }
    }

    const isEventOccurring = this.astronomyService.isEventOccurring(
      capsule.expectedDate,
      24, // 24-hour tolerance
    )

    if (isEventOccurring) {
      // Unlock the capsule
      capsule.unlocked = true
      capsule.unlockedAt = new Date()

      await this.capsuleRepository.save(capsule)

      this.logger.log(`Unlocked capsule ${capsule.id} for ${capsule.eventType} event`)

      return {
        capsuleId: capsule.id,
        unlocked: true,
        message: `Capsule unlocked! The ${capsule.eventType.replace("_", " ")} event has occurred.`,
        unlockedAt: capsule.unlockedAt,
      }
    }

    const timeUntilEvent = capsule.expectedDate.getTime() - new Date().getTime()
    const daysUntilEvent = Math.ceil(timeUntilEvent / (1000 * 60 * 60 * 24))

    return {
      capsuleId: capsule.id,
      unlocked: false,
      message: `Capsule remains locked. Event expected in ${daysUntilEvent} days.`,
    }
  }
}
