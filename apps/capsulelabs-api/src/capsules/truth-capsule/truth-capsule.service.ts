import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { TruthCapsule } from "./entities/truth-capsule.entity"
import { TruthQuestion } from "./entities/truth-question.entity"
import { TruthAnswer } from "./entities/truth-answer.entity"
import type { TruthAnalysisService } from "./services/truth-analysis.service"
import type { QuestionGeneratorService } from "./services/question-generator.service"
import type { CreateTruthCapsuleDto } from "./dto/create-truth-capsule.dto"
import type { SubmitAnswersDto } from "./dto/submit-answers.dto"
import type { ViewTruthCapsuleDto } from "./dto/view-truth-capsule.dto"
import { v4 as uuidv4 } from "uuid"

@Injectable()
export class TruthCapsuleService {
  constructor(
    @InjectRepository(TruthCapsule)
    private readonly truthCapsuleRepository: Repository<TruthCapsule>,
    @InjectRepository(TruthQuestion)
    private readonly truthQuestionRepository: Repository<TruthQuestion>,
    @InjectRepository(TruthAnswer)
    private readonly truthAnswerRepository: Repository<TruthAnswer>,
    private readonly truthAnalysisService: TruthAnalysisService,
    private readonly questionGeneratorService: QuestionGeneratorService,
  ) { }

  async create(createTruthCapsuleDto: CreateTruthCapsuleDto, userId: string): Promise<TruthCapsule> {
    // Create the capsule
    const capsule = this.truthCapsuleRepository.create({
      title: createTruthCapsuleDto.title,
      content: createTruthCapsuleDto.content,
      userId,
      truthThreshold: createTruthCapsuleDto.truthThreshold ?? 0.7,
      maxAttempts: createTruthCapsuleDto.maxAttempts ?? 3,
      isLocked: true,
    })

    const savedCapsule = await this.truthCapsuleRepository.save(capsule)

    // Create the questions
    const questions = createTruthCapsuleDto.questions.map((questionDto, index) => {
      return this.truthQuestionRepository.create({
        capsuleId: savedCapsule.id,
        questionText: questionDto.questionText,
        type: questionDto.type,
        orderIndex: index,
        expectedAnswerPattern: questionDto.expectedAnswerPattern,
        weight: questionDto.weight ?? 1.0,
      })
    })

    await this.truthQuestionRepository.save(questions)

    return this.findOne(savedCapsule.id)
  }

  async findOne(id: string): Promise<TruthCapsule> {
    const capsule = await this.truthCapsuleRepository.findOne({
      where: { id },
      relations: ["questions"],
    })

    if (!capsule) {
      throw new NotFoundException(`Truth capsule with ID ${id} not found`)
    }

    // Sort questions by order index
    if (capsule.questions) {
      capsule.questions.sort((a, b) => a.orderIndex - b.orderIndex)
    }

    return capsule
  }

  async findAll(userId: string): Promise<TruthCapsule[]> {
    return this.truthCapsuleRepository.find({
      where: { userId },
      relations: ["questions"],
    })
  }

  async getQuestionsForCapsule(id: string, userId: string): Promise<ViewTruthCapsuleDto> {
    const capsule = await this.findOne(id)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule")
    }

    // Check if the capsule is locked due to too many attempts
    if (capsule.attemptCount >= capsule.maxAttempts) {
      throw new Error("Maximum attempts exceeded. Capsule is permanently locked.")
    }

    const response: ViewTruthCapsuleDto = {
      id: capsule.id,
      title: capsule.title,
      isLocked: true,
      truthThreshold: capsule.truthThreshold,
      maxAttempts: capsule.maxAttempts,
      attemptCount: capsule.attemptCount,
      questions: capsule.questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        type: q.type,
        orderIndex: q.orderIndex,
        weight: q.weight,
      })),
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }

    return response
  }

  async submitAnswers(id: string, submitAnswersDto: SubmitAnswersDto, userId: string): Promise<ViewTruthCapsuleDto> {
    const capsule = await this.findOne(id)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule")
    }

    // Check if the capsule is locked due to too many attempts
    if (capsule.attemptCount >= capsule.maxAttempts) {
      throw new Error("Maximum attempts exceeded. Capsule is permanently locked.")
    }

    // Generate a session ID for this attempt
    const sessionId = uuidv4()

    // Analyze each answer
    const analysisResults = []
    let totalWeightedScore = 0
    let totalWeight = 0

    for (const answerDto of submitAnswersDto.answers) {
      const question = capsule.questions.find((q) => q.id === answerDto.questionId)
      if (!question) {
        throw new Error(`Question with ID ${answerDto.questionId} not found`)
      }

      // Analyze the answer for truthfulness
      const analysis = await this.truthAnalysisService.analyzeTruthfulness(
        question.questionText,
        answerDto.answerText,
        question.expectedAnswerPattern,
      )

      // Save the answer
      const answer = this.truthAnswerRepository.create({
        userId,
        capsuleId: capsule.id,
        questionId: question.id,
        answerText: answerDto.answerText,
        truthScore: analysis.truthScore,
        sentimentScore: analysis.sentimentScore,
        analysisDetails: analysis.analysisDetails,
        sessionId,
      })

      await this.truthAnswerRepository.save(answer)

      // Calculate weighted score
      const weightedScore = analysis.truthScore * question.weight
      totalWeightedScore += weightedScore
      totalWeight += question.weight

      analysisResults.push({
        questionId: question.id,
        analysis,
        weight: question.weight,
      })
    }

    // Calculate overall truth score
    const overallTruthScore = totalWeightedScore / totalWeight

    // Update attempt count
    capsule.attemptCount += 1
    await this.truthCapsuleRepository.save(capsule)

    // Check if the capsule should be unlocked
    const isUnlocked = overallTruthScore >= capsule.truthThreshold

    const response: ViewTruthCapsuleDto = {
      id: capsule.id,
      title: capsule.title,
      isLocked: !isUnlocked,
      truthThreshold: capsule.truthThreshold,
      maxAttempts: capsule.maxAttempts,
      attemptCount: capsule.attemptCount,
      overallTruthScore,
      sessionId,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }

    // Only include content if unlocked
    if (isUnlocked) {
      response.content = capsule.content
    }

    return response
  }

  async getAnswerHistory(capsuleId: string, userId: string): Promise<TruthAnswer[]> {
    const capsule = await this.findOne(capsuleId)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule's history")
    }

    return this.truthAnswerRepository.find({
      where: { capsuleId, userId },
      relations: ["question"],
      order: { createdAt: "DESC" },
    })
  }

  async generateSuggestedQuestions(userId: string): Promise<any[]> {
    // In a real implementation, this would analyze user data to suggest personalized questions
    return this.questionGeneratorService.suggestPersonalizedQuestions()
  }
}
