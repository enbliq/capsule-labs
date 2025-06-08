import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { RiddleCapsule, RiddleCapsuleStatus } from "../entities/riddle-capsule.entity"
import { RiddleCapsuleInteractionLog, RiddleInteractionType } from "../entities/riddle-capsule-interaction-log.entity"
import { RiddleAttempt } from "../entities/riddle-attempt.entity"
import type { CreateRiddleCapsuleDto } from "../dto/create-riddle-capsule.dto"
import type { AnswerRiddleDto } from "../dto/answer-riddle.dto"
import type { RiddleCapsuleResponseDto, RiddleAttemptResponseDto } from "../dto/riddle-capsule-response.dto"
import type { RiddleService } from "./riddle.service"
import type { RiddleValidationService } from "./riddle-validation.service"

@Injectable()
export class RiddleCapsuleService {
  constructor(
    @InjectRepository(RiddleCapsule) private riddleCapsuleRepository: Repository<RiddleCapsule>,
    @InjectRepository(RiddleCapsuleInteractionLog)
    private interactionLogRepository: Repository<RiddleCapsuleInteractionLog>,
    @InjectRepository(RiddleAttempt) private riddleAttemptRepository: Repository<RiddleAttempt>,
    private riddleService: RiddleService,
    private riddleValidationService: RiddleValidationService,
  ) {}

  async createCapsule(createCapsuleDto: CreateRiddleCapsuleDto): Promise<RiddleCapsuleResponseDto> {
    let riddleId: string | null = null

    // If a specific riddle ID is provided, verify it exists
    if (createCapsuleDto.specificRiddleId) {
      const riddle = await this.riddleService.getRiddleById(createCapsuleDto.specificRiddleId)
      riddleId = riddle.id
    }
    // Otherwise, if not using external API, assign a random riddle based on preferred difficulty
    else if (!createCapsuleDto.useExternalApi) {
      const riddle = await this.riddleService.getRandomRiddle(createCapsuleDto.preferredDifficulty)
      riddleId = riddle.id
    }

    const capsule = this.riddleCapsuleRepository.create({
      ...createCapsuleDto,
      riddleId,
      expiresAt: createCapsuleDto.expiresAt ? new Date(createCapsuleDto.expiresAt) : null,
    })

    const savedCapsule = await this.riddleCapsuleRepository.save(capsule)

    // Log the creation
    await this.logInteraction(savedCapsule.userId, savedCapsule.id, RiddleInteractionType.CREATED, {
      capsuleType: savedCapsule.type,
      useExternalApi: savedCapsule.useExternalApi,
      riddleId: savedCapsule.riddleId,
    })

    // If a riddle was assigned, log it
    if (riddleId) {
      await this.logInteraction(savedCapsule.userId, savedCapsule.id, RiddleInteractionType.RIDDLE_ASSIGNED, {
        riddleId,
      })
    }

    return this.mapToResponseDto(savedCapsule)
  }

  async getCapsuleById(id: string, userId: string): Promise<RiddleCapsuleResponseDto> {
    const capsule = await this.riddleCapsuleRepository.findOne({
      where: { id, userId },
      relations: ["riddle"],
    })

    if (!capsule) {
      throw new NotFoundException("Riddle capsule not found")
    }

    // Log the view
    await this.logInteraction(userId, id, RiddleInteractionType.VIEWED)

    // If the capsule doesn't have a riddle assigned yet and it's locked, assign one
    if (!capsule.riddleId && capsule.status === RiddleCapsuleStatus.LOCKED) {
      await this.assignRiddleToCapsule(capsule)
    }

    // Get the latest attempt to check rate limiting
    const latestAttempt = await this.getLatestAttempt(userId, id)

    return this.mapToResponseDto(capsule, latestAttempt)
  }

  async getUserCapsules(userId: string): Promise<RiddleCapsuleResponseDto[]> {
    const capsules = await this.riddleCapsuleRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      relations: ["riddle"],
    })

    const results: RiddleCapsuleResponseDto[] = []

    for (const capsule of capsules) {
      const latestAttempt = await this.getLatestAttempt(userId, capsule.id)
      results.push(this.mapToResponseDto(capsule, latestAttempt))
    }

    return results
  }

  async attemptRiddleAnswer(
    capsuleId: string,
    userId: string,
    answerDto: AnswerRiddleDto,
  ): Promise<RiddleAttemptResponseDto> {
    const capsule = await this.riddleCapsuleRepository.findOne({
      where: { id: capsuleId, userId },
      relations: ["riddle"],
    })

    if (!capsule) {
      throw new NotFoundException("Riddle capsule not found")
    }

    if (capsule.status !== RiddleCapsuleStatus.LOCKED) {
      throw new BadRequestException("Capsule is not locked")
    }

    // Check if the user has a riddle assigned
    if (!capsule.riddleId && !capsule.useExternalApi) {
      await this.assignRiddleToCapsule(capsule)
    }

    // Check rate limiting
    await this.checkRateLimiting(userId, capsuleId)

    // Get the riddle (either from DB or external API)
    const riddle = capsule.useExternalApi
      ? await this.riddleService.getRiddlesFromExternalApi(capsule.preferredDifficulty)
      : await this.riddleService.getRiddleById(capsule.riddleId)

    // Validate the answer
    const { isCorrect, similarityScore } = this.riddleValidationService.validateAnswer(riddle, answerDto.answer)

    // Calculate next attempt time (12 hours from now)
    const nextAttemptAllowedAt = new Date()
    nextAttemptAllowedAt.setHours(nextAttemptAllowedAt.getHours() + 12)

    // Record the attempt
    const attempt = this.riddleAttemptRepository.create({
      userId,
      capsuleId,
      riddleId: riddle.id,
      submittedAnswer: answerDto.answer,
      isCorrect,
      similarityScore,
      nextAttemptAllowedAt,
      metadata: answerDto.metadata,
    })

    await this.riddleAttemptRepository.save(attempt)

    // Log the attempt
    await this.logInteraction(userId, capsuleId, RiddleInteractionType.RIDDLE_ATTEMPTED, {
      riddleId: riddle.id,
      isCorrect,
      similarityScore,
    })

    if (isCorrect) {
      // Unlock the capsule
      capsule.status = RiddleCapsuleStatus.UNLOCKED
      capsule.unlockedAt = new Date()
      await this.riddleCapsuleRepository.save(capsule)

      // Log successful unlock
      await this.logInteraction(userId, capsuleId, RiddleInteractionType.UNLOCKED)

      return {
        success: true,
        message: "Correct answer! Capsule unlocked successfully.",
        isCorrect: true,
        similarityScore,
        capsule: this.mapToResponseDto(capsule),
      }
    } else {
      let message = "Incorrect answer. Try again in 12 hours."

      // If the answer was close, give a hint
      if (similarityScore > 0.7) {
        message = "Close, but not quite right. Try again in 12 hours."
      }

      return {
        success: false,
        message,
        isCorrect: false,
        similarityScore,
        nextAttemptAllowedAt: attempt.nextAttemptAllowedAt,
      }
    }
  }

  async requestHint(capsuleId: string, userId: string): Promise<{ hint: string }> {
    const capsule = await this.riddleCapsuleRepository.findOne({
      where: { id: capsuleId, userId },
      relations: ["riddle"],
    })

    if (!capsule) {
      throw new NotFoundException("Riddle capsule not found")
    }

    if (capsule.status !== RiddleCapsuleStatus.LOCKED) {
      throw new BadRequestException("Capsule is not locked")
    }

    // Get the riddle (either from DB or external API)
    const riddle = capsule.useExternalApi
      ? await this.riddleService.getRiddlesFromExternalApi(capsule.preferredDifficulty)
      : await this.riddleService.getRiddleById(capsule.riddleId)

    if (!riddle.hint) {
      throw new BadRequestException("No hint available for this riddle")
    }

    // Log the hint request
    await this.logInteraction(userId, capsuleId, RiddleInteractionType.HINT_REQUESTED)

    return { hint: riddle.hint }
  }

  private async assignRiddleToCapsule(capsule: RiddleCapsule): Promise<void> {
    // Get a random riddle based on preferred difficulty
    const riddle = await this.riddleService.getRandomRiddle(capsule.preferredDifficulty)

    // Assign the riddle to the capsule
    capsule.riddleId = riddle.id
    capsule.riddle = riddle
    await this.riddleCapsuleRepository.save(capsule)

    // Log the riddle assignment
    await this.logInteraction(capsule.userId, capsule.id, RiddleInteractionType.RIDDLE_ASSIGNED, {
      riddleId: riddle.id,
    })
  }

  private async checkRateLimiting(userId: string, capsuleId: string): Promise<void> {
    const latestAttempt = await this.getLatestAttempt(userId, capsuleId)

    if (latestAttempt && new Date() < latestAttempt.nextAttemptAllowedAt) {
      const timeRemaining = Math.ceil((latestAttempt.nextAttemptAllowedAt.getTime() - Date.now()) / (1000 * 60 * 60))
      throw new ForbiddenException(
        `Rate limit exceeded. You can attempt again in ${timeRemaining} hour${timeRemaining !== 1 ? "s" : ""}.`,
      )
    }
  }

  private async getLatestAttempt(userId: string, capsuleId: string): Promise<RiddleAttempt | null> {
    return await this.riddleAttemptRepository.findOne({
      where: { userId, capsuleId },
      order: { attemptedAt: "DESC" },
    })
  }

  private async logInteraction(
    userId: string,
    capsuleId: string,
    type: RiddleInteractionType,
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

  private mapToResponseDto(capsule: RiddleCapsule, latestAttempt?: RiddleAttempt | null): RiddleCapsuleResponseDto {
    const response: RiddleCapsuleResponseDto = {
      id: capsule.id,
      title: capsule.title,
      description: capsule.description,
      content: capsule.status === RiddleCapsuleStatus.UNLOCKED ? capsule.content : undefined,
      type: capsule.type,
      status: capsule.status,
      userId: capsule.userId,
      preferredDifficulty: capsule.preferredDifficulty,
      unlockedAt: capsule.unlockedAt,
      expiresAt: capsule.expiresAt,
      metadata: capsule.metadata,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }

    // Add current riddle if capsule is locked
    if (capsule.status === RiddleCapsuleStatus.LOCKED && capsule.riddle) {
      response.currentRiddle = {
        id: capsule.riddle.id,
        question: capsule.riddle.question,
        hint: undefined, // Don't include hint by default, must be requested
        category: capsule.riddle.category,
        difficulty: capsule.riddle.difficulty,
      }
    }

    // Add next attempt time if rate limited
    if (latestAttempt && new Date() < latestAttempt.nextAttemptAllowedAt) {
      response.nextAttemptAllowedAt = latestAttempt.nextAttemptAllowedAt
    }

    return response
  }
}
