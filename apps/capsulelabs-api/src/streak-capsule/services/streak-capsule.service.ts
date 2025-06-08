import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { StreakCapsule, StreakCapsuleStatus } from "../entities/streak-capsule.entity"
import { StreakCapsuleInteractionLog, StreakInteractionType } from "../entities/streak-capsule-interaction-log.entity"
import type { CreateStreakCapsuleDto } from "../dto/create-streak-capsule.dto"
import type { CheckInDto } from "../dto/check-in.dto"
import type { StreakCapsuleResponseDto, CheckInResponseDto } from "../dto/streak-capsule-response.dto"
import type { CheckInService } from "./check-in.service"
import type { StreakCalculationService } from "./streak-calculation.service"

@Injectable()
export class StreakCapsuleService {
  private streakCapsuleRepository: Repository<StreakCapsule>
  private interactionLogRepository: Repository<StreakCapsuleInteractionLog>

  constructor(
    @InjectRepository(StreakCapsule)
    streakCapsuleRepository: Repository<StreakCapsule>,
    @InjectRepository(StreakCapsuleInteractionLog)
    interactionLogRepository: Repository<StreakCapsuleInteractionLog>,
    private checkInService: CheckInService,
    private streakCalculationService: StreakCalculationService,
  ) {
    this.streakCapsuleRepository = streakCapsuleRepository
    this.interactionLogRepository = interactionLogRepository
  }

  async createCapsule(createCapsuleDto: CreateStreakCapsuleDto): Promise<StreakCapsuleResponseDto> {
    const capsule = this.streakCapsuleRepository.create({
      ...createCapsuleDto,
      timezone: createCapsuleDto.timezone || "UTC",
      allowGracePeriod: createCapsuleDto.allowGracePeriod || false,
      gracePeriodHours: createCapsuleDto.gracePeriodHours || 0,
      expiresAt: createCapsuleDto.expiresAt ? new Date(createCapsuleDto.expiresAt) : null,
    })

    const savedCapsule = await this.streakCapsuleRepository.save(capsule)

    // Log the creation
    await this.logInteraction(savedCapsule.userId, savedCapsule.id, StreakInteractionType.CREATED, {
      capsuleType: savedCapsule.type,
      requiredStreakDays: savedCapsule.requiredStreakDays,
    })

    return this.mapToResponseDto(savedCapsule)
  }

  async getCapsuleById(id: string, userId: string): Promise<StreakCapsuleResponseDto> {
    const capsule = await this.streakCapsuleRepository.findOne({
      where: { id, userId },
    })

    if (!capsule) {
      throw new NotFoundException("Streak capsule not found")
    }

    // Update capsule with latest streak data
    await this.updateCapsuleStreakData(capsule)

    // Log the view
    await this.logInteraction(userId, id, StreakInteractionType.VIEWED)

    return this.mapToResponseDto(capsule)
  }

  async getUserCapsules(userId: string): Promise<StreakCapsuleResponseDto[]> {
    const capsules = await this.streakCapsuleRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    })

    // Update all capsules with latest streak data
    for (const capsule of capsules) {
      await this.updateCapsuleStreakData(capsule)
    }

    return capsules.map((capsule) => this.mapToResponseDto(capsule))
  }

  async checkIn(userId: string, checkInDto: CheckInDto = {}): Promise<CheckInResponseDto> {
    const timezone = checkInDto.timezone || "UTC"

    try {
      // Perform the check-in
      const { checkIn, isNewRecord } = await this.checkInService.checkIn(userId, timezone, checkInDto.metadata)

      // Get all user's streak capsules
      const capsules = await this.streakCapsuleRepository.find({
        where: { userId, status: StreakCapsuleStatus.LOCKED },
      })

      let capsuleUnlocked = false
      let unlockedCapsule: StreakCapsule | null = null

      // Update all capsules and check for unlocks
      for (const capsule of capsules) {
        const streakUpdate = await this.streakCalculationService.updateCapsuleStreak(capsule)

        // Update capsule data
        capsule.currentStreak = streakUpdate.currentStreak
        capsule.longestStreak = streakUpdate.longestStreak
        capsule.totalCheckIns = streakUpdate.totalCheckIns
        capsule.lastCheckInDate = checkIn.checkInDate
        capsule.streakStartDate = streakUpdate.currentStreak === 1 ? checkIn.checkInDate : capsule.streakStartDate

        await this.streakCapsuleRepository.save(capsule)

        // Log the check-in for this capsule
        await this.logInteraction(userId, capsule.id, StreakInteractionType.CHECK_IN, {
          checkInDate: checkIn.checkInDate,
          streakDay: checkIn.streakDay,
          currentStreak: streakUpdate.currentStreak,
        })

        // Check if streak is complete and unlock capsule
        if (streakUpdate.isStreakComplete) {
          capsule.status = StreakCapsuleStatus.UNLOCKED
          capsule.unlockedAt = new Date()
          await this.streakCapsuleRepository.save(capsule)

          // Log streak completion and unlock
          await this.logInteraction(userId, capsule.id, StreakInteractionType.STREAK_COMPLETED, {
            requiredDays: capsule.requiredStreakDays,
            completedDays: streakUpdate.currentStreak,
          })

          await this.logInteraction(userId, capsule.id, StreakInteractionType.UNLOCKED)

          capsuleUnlocked = true
          unlockedCapsule = capsule
        }
      }

      return {
        success: true,
        message: `Check-in successful! Current streak: ${checkIn.streakDay} day${checkIn.streakDay !== 1 ? "s" : ""}.`,
        currentStreak: checkIn.streakDay,
        isNewRecord,
        capsuleUnlocked,
        streakCapsule: unlockedCapsule ? this.mapToResponseDto(unlockedCapsule) : undefined,
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException("Failed to check in")
    }
  }

  async getStreakStats(userId: string, timezone = "UTC") {
    return await this.checkInService.getStreakStats(userId, timezone)
  }

  async getUserCheckIns(userId: string, limit = 30) {
    return await this.checkInService.getUserCheckIns(userId, limit)
  }

  private async updateCapsuleStreakData(capsule: StreakCapsule): Promise<void> {
    const streakUpdate = await this.streakCalculationService.updateCapsuleStreak(capsule)

    // Check if streak was broken
    if (streakUpdate.isStreakBroken) {
      await this.logInteraction(capsule.userId, capsule.id, StreakInteractionType.STREAK_BROKEN, {
        previousStreak: capsule.currentStreak,
        newStreak: streakUpdate.currentStreak,
      })
    }

    // Update capsule data
    capsule.currentStreak = streakUpdate.currentStreak
    capsule.longestStreak = streakUpdate.longestStreak
    capsule.totalCheckIns = streakUpdate.totalCheckIns

    // Reset streak start date if streak is broken
    if (streakUpdate.currentStreak === 0) {
      capsule.streakStartDate = null
    }

    await this.streakCapsuleRepository.save(capsule)
  }

  private async logInteraction(
    userId: string,
    capsuleId: string,
    type: StreakInteractionType,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const log = this.interactionLogRepository.create({
      userId,
      capsuleId,
      type,
      metadata,
    })

    await this.interactionLogRepository.save(log)
  }

  private mapToResponseDto(capsule: StreakCapsule): StreakCapsuleResponseDto {
    const progressPercentage = this.streakCalculationService.calculateProgressPercentage(
      capsule.currentStreak,
      capsule.requiredStreakDays,
    )

    const daysRemaining = this.streakCalculationService.calculateDaysRemaining(
      capsule.currentStreak,
      capsule.requiredStreakDays,
    )

    const streakStatus = this.streakCalculationService.getStreakStatus(
      capsule.currentStreak,
      capsule.requiredStreakDays,
      capsule.lastCheckInDate,
      capsule.allowGracePeriod,
      capsule.gracePeriodHours,
      capsule.timezone,
    )

    return {
      id: capsule.id,
      title: capsule.title,
      description: capsule.description,
      content: capsule.status === StreakCapsuleStatus.UNLOCKED ? capsule.content : undefined,
      type: capsule.type,
      status: capsule.status,
      userId: capsule.userId,
      requiredStreakDays: capsule.requiredStreakDays,
      currentStreak: capsule.currentStreak,
      longestStreak: capsule.longestStreak,
      totalCheckIns: capsule.totalCheckIns,
      lastCheckInDate: capsule.lastCheckInDate,
      streakStartDate: capsule.streakStartDate,
      timezone: capsule.timezone,
      allowGracePeriod: capsule.allowGracePeriod,
      gracePeriodHours: capsule.gracePeriodHours,
      unlockedAt: capsule.unlockedAt,
      expiresAt: capsule.expiresAt,
      metadata: capsule.metadata,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
      progressPercentage,
      daysRemaining,
      canCheckInToday: true, // This would be calculated based on timezone and last check-in
      isStreakActive: streakStatus.isActive,
    }
  }
}
