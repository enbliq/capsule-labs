import { Test, type TestingModule } from "@nestjs/testing"
import { TruthCapsuleController } from "../truth-capsule.controller"
import { TruthCapsuleService } from "../truth-capsule.service"
import type { CreateTruthCapsuleDto } from "../dto/create-truth-capsule.dto"
import type { SubmitAnswersDto } from "../dto/submit-answers.dto"
import type { ViewTruthCapsuleDto } from "../dto/view-truth-capsule.dto"
import { QuestionType } from "../entities/truth-question.entity"

describe("TruthCapsuleController", () => {
  let controller: TruthCapsuleController
  let service: TruthCapsuleService

  const mockTruthCapsuleService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getQuestionsForCapsule: jest.fn(),
    submitAnswers: jest.fn(),
    getAnswerHistory: jest.fn(),
    generateSuggestedQuestions: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TruthCapsuleController],
      providers: [
        {
          provide: TruthCapsuleService,
          useValue: mockTruthCapsuleService,
        },
      ],
    }).compile()

    controller = module.get<TruthCapsuleController>(TruthCapsuleController)
    service = module.get<TruthCapsuleService>(TruthCapsuleService)
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
  })

  describe("create", () => {
    it("should create a truth capsule", async () => {
      const createDto: CreateTruthCapsuleDto = {
        title: "Test Capsule",
        content: "Test Content",
        truthThreshold: 0.8,
        maxAttempts: 3,
        questions: [
          {
            questionText: "What is your name?",
            type: QuestionType.PERSONAL,
            weight: 1.0,
          },
        ],
      }

      const userId = "user123"

      const capsule = {
        id: "capsule123",
        title: createDto.title,
        content: createDto.content,
        userId,
        truthThreshold: createDto.truthThreshold,
        maxAttempts: createDto.maxAttempts,
        attemptCount: 0,
        isLocked: true,
        questions: [
          {
            id: "question1",
            questionText: createDto.questions[0].questionText,
            type: createDto.questions[0].type,
            orderIndex: 0,
            weight: createDto.questions[0].weight,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTruthCapsuleService.create.mockResolvedValue(capsule)

      const result = await controller.create(createDto, { user: { id: userId } })

      expect(mockTruthCapsuleService.create).toHaveBeenCalledWith(createDto, userId)
      expect(result).toEqual({
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
      })
    })
  })

  describe("submitAnswers", () => {
    it("should try to unlock a capsule with answers", async () => {
      const submitAnswersDto: SubmitAnswersDto = {
        answers: [
          {
            questionId: "question1",
            answerText: "My name is John Doe",
          },
        ],
      }

      const userId = "user123"

      const viewDto: ViewTruthCapsuleDto = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        isLocked: false,
        truthThreshold: 0.7,
        maxAttempts: 3,
        attemptCount: 1,
        overallTruthScore: 0.8,
        sessionId: "session123",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockTruthCapsuleService.submitAnswers.mockResolvedValue(viewDto)

      const result = await controller.submitAnswers("capsule123", submitAnswersDto, { user: { id: userId } })

      expect(mockTruthCapsuleService.submitAnswers).toHaveBeenCalledWith("capsule123", submitAnswersDto, userId)
      expect(result).toEqual(viewDto)
    })
  })

  describe("findAll", () => {
    it("should return all truth capsules for the user", async () => {
      const userId = "user123"

      const capsules = [
        {
          id: "capsule123",
          title: "Test Capsule 1",
          content: "Secret Content 1",
          userId,
          truthThreshold: 0.7,
          maxAttempts: 3,
          attemptCount: 0,
          isLocked: true,
          questions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "capsule456",
          title: "Test Capsule 2",
          content: "Secret Content 2",
          userId,
          truthThreshold: 0.8,
          maxAttempts: 5,
          attemptCount: 1,
          isLocked: true,
          questions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockTruthCapsuleService.findAll.mockResolvedValue(capsules)

      const result = await controller.findAll({ user: { id: userId } })

      expect(mockTruthCapsuleService.findAll).toHaveBeenCalledWith(userId)
      expect(result).toEqual([
        {
          id: "capsule123",
          title: "Test Capsule 1",
          isLocked: true,
          truthThreshold: 0.7,
          maxAttempts: 3,
          attemptCount: 0,
          createdAt: capsules[0].createdAt,
          updatedAt: capsules[0].updatedAt,
        },
        {
          id: "capsule456",
          title: "Test Capsule 2",
          isLocked: true,
          truthThreshold: 0.8,
          maxAttempts: 5,
          attemptCount: 1,
          createdAt: capsules[1].createdAt,
          updatedAt: capsules[1].updatedAt,
        },
      ])
    })
  })

  describe("getSuggestedQuestions", () => {
    it("should return suggested questions", async () => {
      const userId = "user123"
      const suggestedQuestions = [
        {
          questionText: "What was the name of your first school?",
          type: QuestionType.FACTUAL,
          expectedAnswerPattern: "school",
          weight: 1.2,
        },
        {
          questionText: "Describe your relationship with your parents.",
          type: QuestionType.EMOTIONAL,
          weight: 0.8,
        },
      ]

      mockTruthCapsuleService.generateSuggestedQuestions.mockResolvedValue(suggestedQuestions)

      const result = await controller.getSuggestedQuestions({ user: { id: userId } })

      expect(mockTruthCapsuleService.generateSuggestedQuestions).toHaveBeenCalledWith(userId)
      expect(result).toEqual(suggestedQuestions)
    })
  })
})
