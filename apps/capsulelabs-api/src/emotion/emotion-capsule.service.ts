import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { EmotionCapsule } from "./entities/emotion-capsule.entity"
import type { CreateEmotionCapsuleDto } from "./dto/create-emotion-capsule.dto"
import type { SubmitEmotionDto } from "./dto/submit-emotion.dto"
import type { EmotionCapsuleResponseDto } from "./dto/emotion-capsule-response.dto"
import type { UnlockResultDto } from "./dto/unlock-result.dto"

@Injectable()
export class EmotionCapsuleService {
  private readonly emotionCapsuleRepository: Repository<EmotionCapsule>
  constructor(
    @InjectRepository(EmotionCapsule)
    emotionCapsuleRepository: Repository<EmotionCapsule>
  ) {
    this.emotionCapsuleRepository = emotionCapsuleRepository
  }

  async create(createEmotionCapsuleDto: CreateEmotionCapsuleDto): Promise<EmotionCapsuleResponseDto> {
    const capsule = this.emotionCapsuleRepository.create(createEmotionCapsuleDto)
    const savedCapsule = await this.emotionCapsuleRepository.save(capsule)
    return this.mapToResponseDto(savedCapsule)
  }

  async findAll(): Promise<EmotionCapsuleResponseDto[]> {
    const capsules = await this.emotionCapsuleRepository.find({
      order: { createdAt: "DESC" },
    })
    return capsules.map((capsule) => this.mapToResponseDto(capsule))
  }

  async findByUser(userId: string): Promise<EmotionCapsuleResponseDto[]> {
    const capsules = await this.emotionCapsuleRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    })
    return capsules.map((capsule) => this.mapToResponseDto(capsule))
  }

  async findOne(id: string): Promise<EmotionCapsuleResponseDto> {
    const capsule = await this.findCapsuleById(id)
    return this.mapToResponseDto(capsule)
  }

  async attemptUnlock(id: string, submitEmotionDto: SubmitEmotionDto): Promise<UnlockResultDto> {
    const capsule = await this.findCapsuleById(id)

    // Update attempt count and timestamp
    capsule.unlockAttempts += 1
    capsule.lastUnlockAttempt = new Date()

    const { emotion, confidence } = submitEmotionDto
    const emotionMatch = emotion.toLowerCase() === capsule.targetEmotion.toLowerCase()
    const confidenceMatch = confidence >= capsule.detectionConfidence

    // Check if emotion and confidence match
    if (emotionMatch && confidenceMatch) {
      capsule.unlocked = true
      await this.emotionCapsuleRepository.save(capsule)

      return {
        success: true,
        message: `Capsule unlocked successfully with ${emotion} emotion!`,
        content: capsule.content,
        unlocked: true,
        emotionMatch,
        confidenceMatch,
        requiredConfidence: capsule.detectionConfidence,
        providedConfidence: confidence,
        attemptsCount: capsule.unlockAttempts,
      }
    }

    // Save the attempt even if unsuccessful
    await this.emotionCapsuleRepository.save(capsule)

    // Return detailed failure information
    return {
      success: false,
      message: this.generateFailureMessage(emotionMatch, confidenceMatch, capsule, emotion, confidence),
      unlocked: false,
      emotionMatch,
      confidenceMatch,
      requiredConfidence: capsule.detectionConfidence,
      providedConfidence: confidence,
      attemptsCount: capsule.unlockAttempts,
    }
  }

  private generateFailureMessage(
    emotionMatch: boolean,
    confidenceMatch: boolean,
    capsule: EmotionCapsule,
    providedEmotion: string,
    providedConfidence: number,
  ): string {
    if (!emotionMatch && !confidenceMatch) {
      return `Unlock failed: Expected ${capsule.targetEmotion} emotion with at least ${capsule.detectionConfidence} confidence. Received ${providedEmotion} with ${providedConfidence} confidence.`
    } else if (!emotionMatch) {
      return `Unlock failed: Expected ${capsule.targetEmotion} emotion but received ${providedEmotion}.`
    } else {
      return `Unlock failed: Confidence level too low. Required ${capsule.detectionConfidence} but received ${providedConfidence}.`
    }
  }

  private async findCapsuleById(id: string): Promise<EmotionCapsule> {
    const capsule = await this.emotionCapsuleRepository.findOne({
      where: { id },
    })

    if (!capsule) {
      throw new NotFoundException(`Emotion capsule with ID ${id} not found`)
    }

    return capsule
  }

  private mapToResponseDto(capsule: EmotionCapsule): EmotionCapsuleResponseDto {
    return {
      id: capsule.id,
      title: capsule.title,
      // Only include content if the capsule is unlocked
      content: capsule.unlocked ? capsule.content : undefined,
      userId: capsule.userId,
      targetEmotion: capsule.targetEmotion,
      detectionConfidence: capsule.detectionConfidence,
      unlocked: capsule.unlocked,
      unlockAttempts: capsule.unlockAttempts,
      lastUnlockAttempt: capsule.lastUnlockAttempt,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }
  }
}
