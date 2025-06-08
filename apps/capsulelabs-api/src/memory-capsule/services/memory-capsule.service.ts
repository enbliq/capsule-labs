import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type MemoryCapsule, CapsuleStatus } from "../entities/memory-capsule.entity"
import { type CapsuleInteractionLog, InteractionType } from "../entities/capsule-interaction-log.entity"
import { type MemoryQuestion, QuestionStatus } from "../entities/memory-question.entity"
import type { DailyLog } from "../entities/daily-log.entity"
import type { CreateMemoryCapsuleDto } from "../dto/create-memory-capsule.dto"
import type { AnswerMemoryQuestionDto } from "../dto/answer-memory-question.dto"
import type { CreateDailyLogDto } from "../dto/create-daily-log.dto"
import type { MemoryCapsuleResponseDto, UnlockAttemptResponseDto } from "../dto/memory-capsule-response.dto"
import type { QuestionGeneratorService } from "./question-generator.service"
import type { AnswerValidationService } from "./answer-validation.service"

@Injectable()
export class MemoryCapsuleService {
  constructor(
    private memoryCapsuleRepository: Repository<MemoryCapsule>,
    private interactionLogRepository: Repository<CapsuleInteractionLog>,
    private memoryQuestionRepository: Repository<MemoryQuestion>,
    private dailyLogRepository: Repository<DailyLog>,
    private questionGeneratorService: QuestionGeneratorService,
    private answerValidationService: AnswerValidationService,
  ) {}

  async createCapsule(createCapsuleDto: CreateMemoryCapsuleDto): Promise<MemoryCapsuleResponseDto> {
    const capsule = this.memoryCapsuleRepository.create({
      ...createCapsuleDto,
      expiresAt: createCapsuleDto.expiresAt ? new Date(createCapsuleDto.expiresAt) : null,
    })

    const savedCapsule = await this.memoryCapsuleRepository.save(capsule)

    // Log the creation
    await this.logInteraction(savedCapsule.userId, savedCapsule.id, InteractionType.CREATED, {
      capsuleType: savedCapsule.type,
    })

    return this.mapToResponseDto(savedCapsule)
  }

  async getCapsuleById(id: string, userId: string): Promise<MemoryCapsuleResponseDto> {
    const capsule = await this.memoryCapsuleRepository.findOne({
      where: { id, userId },
      relations: ["memoryQuestions"],
    })

    if (!capsule) {
      throw new NotFoundException("Capsule not found")
    }

    // Log the view
    await this.logInteraction(userId, id, InteractionType.VIEWED)

    const response = this.mapToResponseDto(capsule)

    // Add current active question if capsule is locked
    if (capsule.status === CapsuleStatus.LOCKED) {
      const activeQuestion = await this.getOrCreateActiveQuestion(capsule)
      if (activeQuestion) {
        response.currentQuestion = {
          id: activeQuestion.id,
          question: activeQuestion.question,
          type: activeQuestion.type,
          status: activeQuestion.status,
          answeredAt: activeQuestion.answeredAt,
          expiresAt: activeQuestion.expiresAt,
          createdAt: activeQuestion.createdAt,
        }
      }
    }

    return response
  }

  async getUserCapsules(userId: string): Promise<MemoryCapsuleResponseDto[]> {
    const capsules = await this.memoryCapsuleRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    })

    return capsules.map((capsule) => this.mapToResponseDto(capsule))
  }

  async attemptUnlock(
    capsuleId: string,
    answerDto: AnswerMemoryQuestionDto,
    userId: string,
  ): Promise<UnlockAttemptResponseDto> {
    const capsule = await this.memoryCapsuleRepository.findOne({
      where: { id: capsuleId, userId },
    })

    if (!capsule) {
      throw new NotFoundException("Capsule not found")
    }

    if (capsule.status !== CapsuleStatus.LOCKED) {
      throw new BadRequestException("Capsule is not locked")
    }

    if (capsule.unlockAttempts >= capsule.maxUnlockAttempts) {
      throw new ForbiddenException("Maximum unlock attempts exceeded")
    }

    const question = await this.memoryQuestionRepository.findOne({
      where: { id: answerDto.questionId, capsuleId, userId },
    })

    if (!question) {
      throw new NotFoundException("Question not found")
    }

    if (question.status !== QuestionStatus.ACTIVE) {
      throw new BadRequestException("Question is not active")
    }

    // Validate the answer
    const isCorrect = this.answerValidationService.validateAnswer(question, answerDto.answer)

    // Update question with user's answer
    question.userAnswer = answerDto.answer
    question.answeredAt = new Date()
    question.status = isCorrect ? QuestionStatus.ANSWERED_CORRECT : QuestionStatus.ANSWERED_INCORRECT
    await this.memoryQuestionRepository.save(question)

    // Update capsule unlock attempts
    capsule.unlockAttempts += 1

    // Log the attempt
    await this.logInteraction(userId, capsuleId, InteractionType.QUESTION_ANSWERED, {
      questionId: question.id,
      isCorrect,
      attempt: capsule.unlockAttempts,
    })

    if (isCorrect) {
      // Unlock the capsule
      capsule.status = CapsuleStatus.UNLOCKED
      capsule.unlockedAt = new Date()
      await this.memoryCapsuleRepository.save(capsule)

      // Log successful unlock
      await this.logInteraction(userId, capsuleId, InteractionType.UNLOCKED)

      return {
        success: true,
        message: "Capsule unlocked successfully!",
        capsule: this.mapToResponseDto(capsule),
      }
    } else {
      await this.memoryCapsuleRepository.save(capsule)

      const remainingAttempts = capsule.maxUnlockAttempts - capsule.unlockAttempts

      if (remainingAttempts <= 0) {
        // Mark capsule as expired if no attempts left
        capsule.status = CapsuleStatus.EXPIRED
        await this.memoryCapsuleRepository.save(capsule)

        await this.logInteraction(userId, capsuleId, InteractionType.EXPIRED)

        return {
          success: false,
          message: "Incorrect answer. Capsule has been locked permanently.",
          remainingAttempts: 0,
        }
      }

      return {
        success: false,
        message: `Incorrect answer. ${remainingAttempts} attempts remaining.`,
        remainingAttempts,
      }
    }
  }

  async createDailyLog(createDailyLogDto: CreateDailyLogDto): Promise<DailyLog> {
    // Check if log already exists for this date
    const existingLog = await this.dailyLogRepository.findOne({
      where: {
        userId: createDailyLogDto.userId,
        logDate: new Date(createDailyLogDto.logDate),
      },
    })

    if (existingLog) {
      // Update existing log
      Object.assign(existingLog, {
        ...createDailyLogDto,
        logDate: new Date(createDailyLogDto.logDate),
      })
      return await this.dailyLogRepository.save(existingLog)
    }

    const dailyLog = this.dailyLogRepository.create({
      ...createDailyLogDto,
      logDate: new Date(createDailyLogDto.logDate),
    })

    return await this.dailyLogRepository.save(dailyLog)
  }

  async getUserDailyLogs(userId: string, limit = 30): Promise<DailyLog[]> {
    return await this.dailyLogRepository.find({
      where: { userId },
      order: { logDate: "DESC" },
      take: limit,
    })
  }

  private async getOrCreateActiveQuestion(capsule: MemoryCapsule): Promise<MemoryQuestion | null> {
    // Check for existing active question
    let activeQuestion = await this.memoryQuestionRepository.findOne({
      where: {
        capsuleId: capsule.id,
        status: QuestionStatus.ACTIVE,
      },
    })

    if (!activeQuestion) {
      // Generate new question
      const questionData = await this.questionGeneratorService.generateQuestionForCapsule(capsule)

      if (questionData) {
        activeQuestion = this.memoryQuestionRepository.create({
          ...questionData,
          capsuleId: capsule.id,
          userId: capsule.userId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        })

        activeQuestion = await this.memoryQuestionRepository.save(activeQuestion)
      }
    }

    return activeQuestion
  }

  private async logInteraction(
    userId: string,
    capsuleId: string,
    type: InteractionType,
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

  private mapToResponseDto(capsule: MemoryCapsule): MemoryCapsuleResponseDto {
    return {
      id: capsule.id,
      title: capsule.title,
      description: capsule.description,
      content: capsule.status === CapsuleStatus.UNLOCKED ? capsule.content : undefined,
      type: capsule.type,
      status: capsule.status,
      userId: capsule.userId,
      unlockedAt: capsule.unlockedAt,
      expiresAt: capsule.expiresAt,
      unlockAttempts: capsule.unlockAttempts,
      maxUnlockAttempts: capsule.maxUnlockAttempts,
      metadata: capsule.metadata,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }
  }
}
