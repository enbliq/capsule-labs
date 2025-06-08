import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { DreamCapsule, DreamCapsuleStatus } from "../entities/dream-capsule.entity"
import { DreamCapsuleInteractionLog, DreamInteractionType } from "../entities/dream-capsule-interaction-log.entity"
import type { CreateDreamCapsuleDto } from "../dto/create-dream-capsule.dto"
import type { LogDreamDto } from "../dto/log-dream.dto"
import type {
  DreamCapsuleResponseDto,
  LogDreamResponseDto,
  DreamLogResponseDto,
} from "../dto/dream-capsule-response.dto"
import type { DreamLogService } from "./dream-log.service"
import type { DreamValidationService } from "./dream-validation.service"

@Injectable()
export class DreamCapsuleService {
  private dreamCapsuleRepository: Repository<DreamCapsule>
  private interactionLogRepository: Repository<DreamCapsuleInteractionLog>

  constructor(
    @InjectRepository(DreamCapsule)
    dreamCapsuleRepository: Repository<DreamCapsule>,
    @InjectRepository(DreamCapsuleInteractionLog)
    interactionLogRepository: Repository<DreamCapsuleInteractionLog>,
    private dreamLogService: DreamLogService,
    private dreamValidationService: DreamValidationService,
  ) {
    this.dreamCapsuleRepository = dreamCapsuleRepository
    this.interactionLogRepository = interactionLogRepository
  }

  async createCapsule(createCapsuleDto: CreateDreamCapsuleDto): Promise<DreamCapsuleResponseDto> {
    const capsule = this.dreamCapsuleRepository.create({
      ...createCapsuleDto,
      minimumWordCount: createCapsuleDto.minimumWordCount || 50,
      cutoffTime: createCapsuleDto.cutoffTime || "09:00:00",
      timezone: createCapsuleDto.timezone || "UTC",
      expiresAt: createCapsuleDto.expiresAt ? new Date(createCapsuleDto.expiresAt) : null,
    })

    const savedCapsule = await this.dreamCapsuleRepository.save(capsule)

    // Log the creation
    await this.logInteraction(savedCapsule.userId, savedCapsule.id, DreamInteractionType.CREATED, {
      capsuleType: savedCapsule.type,
      minimumWordCount: savedCapsule.minimumWordCount,
      cutoffTime: savedCapsule.cutoffTime,
    })

    return this.mapToResponseDto(savedCapsule)
  }

  async getCapsuleById(id: string, userId: string): Promise<DreamCapsuleResponseDto> {
    const capsule = await this.dreamCapsuleRepository.findOne({
      where: { id, userId },
    })

    if (!capsule) {
      throw new NotFoundException("Dream capsule not found")
    }

    // Log the view
    await this.logInteraction(userId, id, DreamInteractionType.VIEWED)

    return this.mapToResponseDto(capsule)
  }

  async getUserCapsules(userId: string): Promise<DreamCapsuleResponseDto[]> {
    const capsules = await this.dreamCapsuleRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    })

    const results: DreamCapsuleResponseDto[] = []

    for (const capsule of capsules) {
      results.push(await this.mapToResponseDto(capsule))
    }

    return results
  }

  async logDream(userId: string, logDreamDto: LogDreamDto): Promise<LogDreamResponseDto> {
    try {
      // Log the dream
      const dreamLog = await this.dreamLogService.logDream(userId, logDreamDto)

      // Get all user's locked dream capsules
      const capsules = await this.dreamCapsuleRepository.find({
        where: { userId, status: DreamCapsuleStatus.LOCKED },
      })

      let capsuleUnlocked = false
      let unlockedCapsule: DreamCapsule | null = null

      // Check each capsule to see if it can be unlocked
      for (const capsule of capsules) {
        // Validate the dream log against capsule requirements
        const validation = this.dreamValidationService.validateDreamLog(
          dreamLog,
          capsule.minimumWordCount,
          capsule.cutoffTime,
        )

        // Log the validation result
        await this.logInteraction(
          userId,
          capsule.id,
          validation.isValid ? DreamInteractionType.DREAM_VALIDATED : DreamInteractionType.DREAM_REJECTED,
          {
            dreamLogId: dreamLog.id,
            wordCount: dreamLog.wordCount,
            isBeforeCutoff: dreamLog.isBeforeCutoff,
            validationReasons: validation.reasons,
          },
        )

        // If valid, unlock the capsule
        if (validation.isValid) {
          capsule.status = DreamCapsuleStatus.UNLOCKED
          capsule.unlockedAt = new Date()
          capsule.unlockedByDreamLogId = dreamLog.id
          await this.dreamCapsuleRepository.save(capsule)

          // Log the unlock
          await this.logInteraction(userId, capsule.id, DreamInteractionType.UNLOCKED, {
            dreamLogId: dreamLog.id,
          })

          capsuleUnlocked = true
          unlockedCapsule = capsule
        }
      }

      // Prepare response
      const response: LogDreamResponseDto = {
        success: true,
        message: capsuleUnlocked ? "Dream logged successfully and capsule unlocked!" : "Dream logged successfully!",
        dreamLog: this.mapDreamLogToResponseDto(dreamLog),
        capsuleUnlocked,
      }

      if (unlockedCapsule) {
        response.unlockedCapsule = await this.mapToResponseDto(unlockedCapsule)
      }

      return response
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException("Failed to log dream")
    }
  }

  private async logInteraction(
    userId: string,
    capsuleId: string,
    type: DreamInteractionType,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const log = this.interactionLogRepository.create({
      userId,
      capsuleId,
      type,
      dreamLogId: metadata?.dreamLogId,
      metadata,
    })

    await this.interactionLogRepository.save(log)
  }

  private async mapToResponseDto(capsule: DreamCapsule): Promise<DreamCapsuleResponseDto> {
    // Check if user can unlock today (hasn't logged a dream yet today)
    const todaysDreamLog = await this.dreamLogService.getTodaysDreamLog(capsule.userId, capsule.timezone)
    const canUnlockToday = !todaysDreamLog && capsule.status === DreamCapsuleStatus.LOCKED

    const response: DreamCapsuleResponseDto = {
      id: capsule.id,
      title: capsule.title,
      description: capsule.description,
      content: capsule.status === DreamCapsuleStatus.UNLOCKED ? capsule.content : undefined,
      type: capsule.type,
      status: capsule.status,
      userId: capsule.userId,
      minimumWordCount: capsule.minimumWordCount,
      cutoffTime: capsule.cutoffTime,
      timezone: capsule.timezone,
      unlockedAt: capsule.unlockedAt,
      expiresAt: capsule.expiresAt,
      unlockedByDreamLogId: capsule.unlockedByDreamLogId,
      metadata: capsule.metadata,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
      canUnlockToday,
    }

    // Include today's dream log if it exists
    if (todaysDreamLog) {
      response.todaysDreamLog = this.mapDreamLogToResponseDto(todaysDreamLog)
    }

    return response
  }

  private mapDreamLogToResponseDto(dreamLog: any): DreamLogResponseDto {
    return {
      id: dreamLog.id,
      content: dreamLog.content,
      wordCount: dreamLog.wordCount,
      title: dreamLog.title,
      clarity: dreamLog.clarity,
      emotion: dreamLog.emotion,
      isLucid: dreamLog.isLucid,
      timezone: dreamLog.timezone,
      isBeforeCutoff: dreamLog.isBeforeCutoff,
      createdAt: dreamLog.createdAt,
      logDate: dreamLog.logDate,
    }
  }
}
