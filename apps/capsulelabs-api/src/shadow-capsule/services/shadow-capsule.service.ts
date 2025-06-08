import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { ShadowCapsule, ShadowCapsuleStatus } from "../entities/shadow-capsule.entity"
import { ShadowCapsuleInteractionLog, ShadowInteractionType } from "../entities/shadow-capsule-interaction-log.entity"
import type { CreateShadowCapsuleDto } from "../dto/create-shadow-capsule.dto"
import type { UpdateLocationDto } from "../dto/update-location.dto"
import type { ShadowCapsuleResponseDto, UnlockAttemptResponseDto } from "../dto/shadow-capsule-response.dto"
import type { TwilightCalculationService } from "./twilight-calculation.service"

@Injectable()
export class ShadowCapsuleService {
  constructor(
    @InjectRepository(ShadowCapsule)
    private shadowCapsuleRepository: Repository<ShadowCapsule>,
    @InjectRepository(ShadowCapsuleInteractionLog)
    private interactionLogRepository: Repository<ShadowCapsuleInteractionLog>,
    private twilightCalculationService: TwilightCalculationService,
  ) {}

  async createCapsule(createCapsuleDto: CreateShadowCapsuleDto): Promise<ShadowCapsuleResponseDto> {
    // Calculate twilight times for the capsule's location
    const twilightTimes = this.twilightCalculationService.calculateTwilightTimes(
      createCapsuleDto.latitude,
      createCapsuleDto.longitude,
    )

    const capsule = this.shadowCapsuleRepository.create({
      ...createCapsuleDto,
      expiresAt: createCapsuleDto.expiresAt ? new Date(createCapsuleDto.expiresAt) : null,
      lastTwilightStart: twilightTimes.twilightStart,
      lastTwilightEnd: twilightTimes.twilightEnd,
      nextTwilightStart: twilightTimes.nextTwilightStart,
      nextTwilightEnd: twilightTimes.nextTwilightEnd,
    })

    const savedCapsule = await this.shadowCapsuleRepository.save(capsule)

    // Log the creation
    await this.logInteraction(savedCapsule.userId, savedCapsule.id, ShadowInteractionType.CREATED, {
      capsuleType: savedCapsule.type,
      location: {
        latitude: savedCapsule.latitude,
        longitude: savedCapsule.longitude,
      },
    })

    return this.mapToResponseDto(savedCapsule)
  }

  async getCapsuleById(id: string, userId: string): Promise<ShadowCapsuleResponseDto> {
    const capsule = await this.shadowCapsuleRepository.findOne({
      where: { id, userId },
    })

    if (!capsule) {
      throw new NotFoundException("Shadow capsule not found")
    }

    // Update twilight times if they're outdated
    await this.updateTwilightTimesIfNeeded(capsule)

    // Log the view
    await this.logInteraction(userId, id, ShadowInteractionType.VIEWED)

    return this.mapToResponseDto(capsule)
  }

  async getUserCapsules(userId: string): Promise<ShadowCapsuleResponseDto[]> {
    const capsules = await this.shadowCapsuleRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    })

    // Update twilight times for all capsules
    for (const capsule of capsules) {
      await this.updateTwilightTimesIfNeeded(capsule)
    }

    return capsules.map((capsule) => this.mapToResponseDto(capsule))
  }

  async attemptUnlock(capsuleId: string, userId: string): Promise<UnlockAttemptResponseDto> {
    const capsule = await this.shadowCapsuleRepository.findOne({
      where: { id: capsuleId, userId },
    })

    if (!capsule) {
      throw new NotFoundException("Shadow capsule not found")
    }

    if (capsule.status !== ShadowCapsuleStatus.LOCKED) {
      throw new BadRequestException("Capsule is not locked")
    }

    // Update twilight times
    await this.updateTwilightTimesIfNeeded(capsule)

    // Check if current time is within twilight period
    const isWithinTwilight = this.twilightCalculationService.isCurrentlyTwilight(capsule.latitude, capsule.longitude)

    // Log the attempt
    await this.logInteraction(userId, capsuleId, ShadowInteractionType.UNLOCK_ATTEMPTED, {
      isWithinTwilight,
      twilightStart: capsule.lastTwilightStart,
      twilightEnd: capsule.lastTwilightEnd,
    })

    if (!isWithinTwilight) {
      const timeUntilNext = this.twilightCalculationService.getTimeUntilNextTwilight(
        capsule.latitude,
        capsule.longitude,
      )

      return {
        success: false,
        message: `Capsule can only be unlocked during twilight hours. Next twilight in ${timeUntilNext.formatted}.`,
      }
    }

    // Unlock the capsule
    capsule.status = ShadowCapsuleStatus.UNLOCKED
    capsule.unlockedAt = new Date()
    await this.shadowCapsuleRepository.save(capsule)

    // Log successful unlock
    await this.logInteraction(userId, capsuleId, ShadowInteractionType.UNLOCKED)

    return {
      success: true,
      message: "Capsule unlocked successfully!",
      capsule: this.mapToResponseDto(capsule),
    }
  }

  async updateLocation(
    capsuleId: string,
    userId: string,
    updateLocationDto: UpdateLocationDto,
  ): Promise<ShadowCapsuleResponseDto> {
    const capsule = await this.shadowCapsuleRepository.findOne({
      where: { id: capsuleId, userId },
    })

    if (!capsule) {
      throw new NotFoundException("Shadow capsule not found")
    }

    if (capsule.status !== ShadowCapsuleStatus.LOCKED) {
      throw new BadRequestException("Cannot update location of an unlocked or expired capsule")
    }

    // Update location
    capsule.latitude = updateLocationDto.latitude
    capsule.longitude = updateLocationDto.longitude

    // Recalculate twilight times
    const twilightTimes = this.twilightCalculationService.calculateTwilightTimes(
      updateLocationDto.latitude,
      updateLocationDto.longitude,
    )

    capsule.lastTwilightStart = twilightTimes.twilightStart
    capsule.lastTwilightEnd = twilightTimes.twilightEnd
    capsule.nextTwilightStart = twilightTimes.nextTwilightStart
    capsule.nextTwilightEnd = twilightTimes.nextTwilightEnd

    const updatedCapsule = await this.shadowCapsuleRepository.save(capsule)

    return this.mapToResponseDto(updatedCapsule)
  }

  private async updateTwilightTimesIfNeeded(capsule: ShadowCapsule): Promise<void> {
    const now = new Date()

    // If next twilight end is in the past, we need to update the twilight times
    if (!capsule.nextTwilightEnd || capsule.nextTwilightEnd < now) {
      const twilightTimes = this.twilightCalculationService.calculateTwilightTimes(capsule.latitude, capsule.longitude)

      capsule.lastTwilightStart = twilightTimes.twilightStart
      capsule.lastTwilightEnd = twilightTimes.twilightEnd
      capsule.nextTwilightStart = twilightTimes.nextTwilightStart
      capsule.nextTwilightEnd = twilightTimes.nextTwilightEnd

      await this.shadowCapsuleRepository.save(capsule)
    }
  }

  private async logInteraction(
    userId: string,
    capsuleId: string,
    type: ShadowInteractionType,
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

  private mapToResponseDto(capsule: ShadowCapsule): ShadowCapsuleResponseDto {
    const isCurrentlyUnlockable = this.twilightCalculationService.isCurrentlyTwilight(
      capsule.latitude,
      capsule.longitude,
    )

    const timeUntilUnlockable = !isCurrentlyUnlockable
      ? this.twilightCalculationService.getTimeUntilNextTwilight(capsule.latitude, capsule.longitude).formatted
      : undefined

    return {
      id: capsule.id,
      title: capsule.title,
      description: capsule.description,
      content: capsule.status === ShadowCapsuleStatus.UNLOCKED ? capsule.content : undefined,
      type: capsule.type,
      status: capsule.status,
      userId: capsule.userId,
      latitude: capsule.latitude,
      longitude: capsule.longitude,
      lastTwilightStart: capsule.lastTwilightStart,
      lastTwilightEnd: capsule.lastTwilightEnd,
      nextTwilightStart: capsule.nextTwilightStart,
      nextTwilightEnd: capsule.nextTwilightEnd,
      unlockedAt: capsule.unlockedAt,
      expiresAt: capsule.expiresAt,
      isCurrentlyUnlockable,
      timeUntilUnlockable,
      metadata: capsule.metadata,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }
  }
}
