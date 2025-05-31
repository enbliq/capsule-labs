import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { TruthCapsuleService } from "../truth-capsule.service"
import { TruthAnalysisService } from "../services/truth-analysis.service"
import { QuestionGeneratorService } from "../services/question-generator.service"
import { TruthCapsule } from "../entities/truth-capsule.entity"
import { TruthQuestion } from "../entities/truth-question.entity"
import { TruthAnswer } from "../entities/truth-answer.entity"
import type { CreateTruthCapsuleDto } from "../dto/create-truth-capsule.dto"
import type { SubmitAnswersDto } from "../dto/submit-answers.dto"
import { QuestionType } from "../entities/truth-question.entity"
import { NotFoundException } from "@nestjs/common"

describe("TruthCapsuleService", () => {
  let service: TruthCapsuleService
  let truthAnalysisService: TruthAnalysisService
  let capsuleRepository: Repository<TruthCapsule>
  let questionRepository: Repository<TruthQuestion>
  let answerRepository: Repository<TruthAnswer>

  const mockCapsuleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }

  const mockQuestionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  const mockAnswerRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  const mockTruthAnalysisService = {
    analyzeTruthfulness: jest.fn(),
  }

  const mockQuestionGeneratorService = {
    suggestPersonalizedQuestions: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TruthCapsuleService,
        {
          provide: getRepositoryToken(TruthCapsule),
          useValue: mockCapsuleRepository,
        },
        {
          provide: getRepositoryToken(TruthQuestion),
          useValue: mockQuestionRepository,
        },
        {
          provide: getRepositoryToken(TruthAnswer),
          useValue: mockAnswerRepository,
        },
        {
          provide: TruthAnalysisService,
          useValue: mockTruthAnalysisService,
        },
        {
          provide: QuestionGeneratorService,
          useValue: mockQuestionGeneratorService,
        },
      ],
    }).compile()

    service = module.get<TruthCapsuleService>(TruthCapsuleService)
    truthAnalysisService = module.get<TruthAnalysisService>(TruthAnalysisService)
    capsuleRepository = module.get<Repository<TruthCapsule>>(getRepositoryToken(TruthCapsule))
    questionRepository = module.get<Repository<TruthQuestion>>(getRepositoryToken(TruthQuestion))
    answerRepository = module.get<Repository<TruthAnswer>>(getRepositoryToken(TruthAnswer))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("create", () => {
    it("should create a new truth capsule with questions", async () => {
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
          {
            questionText: "Where were you born?",
            type: QuestionType.FACTUAL,
            weight: 1.2,
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
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const questions = [
        {
          id: "question1",
          capsuleId: capsule.id,
          questionText: createDto.questions[0].questionText,
          type: createDto.questions[0].type,
          orderIndex: 0,
          weight: createDto.questions[0].weight,
        },
        {
          id: "question2",
          capsuleId: capsule.id,
          questionText: createDto.questions[1].questionText,
          type: createDto.questions[1].type,
          orderIndex: 1,
          weight: createDto.questions[1].weight,
        },
      ]

      mockCapsuleRepository.create.mockReturnValue(capsule)
      mockCapsuleRepository.save.mockResolvedValue(capsule)
      mockQuestionRepository.create.mockImplementation((data) => data)
      mockQuestionRepository.save.mockResolvedValue(questions)
      mockCapsuleRepository.findOne.mockResolvedValue({ ...capsule, questions })

      const result = await service.create(createDto, userId)

      expect(mockCapsuleRepository.create).toHaveBeenCalledWith({
        title: createDto.title,
        content: createDto.content,
        userId,
        truthThreshold: createDto.truthThreshold,
        maxAttempts: createDto.maxAttempts,
        isLocked: true,
      })
      expect(mockCapsuleRepository.save).toHaveBeenCalledWith(capsule)
      expect(mockQuestionRepository.save).toHaveBeenCalled()
      expect(result.questions).toHaveLength(2)
    })
  })

  describe("submitAnswers", () => {
    it("should unlock capsule when truth score meets threshold", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        truthThreshold: 0.7,
        maxAttempts: 3,
        attemptCount: 0,
        isLocked: true,
        questions: [
          {
            id: "question1",
            questionText: "What is your name?",
            type: QuestionType.PERSONAL,
            weight: 1.0,
            orderIndex: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const submitAnswersDto: SubmitAnswersDto = {
        answers: [
          {
            questionId: "question1",
            answerText: "My name is John Doe",
          },
        ],
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)

      mockTruthAnalysisService.analyzeTruthfulness.mockResolvedValue({
        truthScore: 0.8,
        sentimentScore: 0.6,
        analysisDetails: "High truthfulness indicators detected",
        confidence: 0.9,
      })

      mockAnswerRepository.create.mockReturnValue({
        userId: "user123",
        capsuleId: capsule.id,
        questionId: "question1",
        answerText: "My name is John Doe",
        truthScore: 0.8,
        sentimentScore: 0.6,
        analysisDetails: "High truthfulness indicators detected",
        sessionId: expect.any(String),
      })

      mockAnswerRepository.save.mockResolvedValue({})
      mockCapsuleRepository.save.mockResolvedValue({ ...capsule, attemptCount: 1 })

      const result = await service.submitAnswers("capsule123", submitAnswersDto, "user123")

      expect(result.isLocked).toBe(false)
      expect(result.content).toBe("Secret Content")
      expect(result.overallTruthScore).toBe(0.8)
      expect(result.attemptCount).toBe(1)

      expect(mockTruthAnalysisService.analyzeTruthfulness).toHaveBeenCalledWith(
        "What is your name?",
        "My name is John Doe",
        undefined,
      )
    })

    it("should keep capsule locked when truth score is below threshold", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        truthThreshold: 0.7,
        maxAttempts: 3,
        attemptCount: 0,
        isLocked: true,
        questions: [
          {
            id: "question1",
            questionText: "What is your name?",
            type: QuestionType.PERSONAL,
            weight: 1.0,
            orderIndex: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const submitAnswersDto: SubmitAnswersDto = {
        answers: [
          {
            questionId: "question1",
            answerText: "I don't want to say",
          },
        ],
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)

      mockTruthAnalysisService.analyzeTruthfulness.mockResolvedValue({
        truthScore: 0.3,
        sentimentScore: 0.4,
        analysisDetails: "Potential deception markers found",
        confidence: 0.6,
      })

      mockAnswerRepository.create.mockReturnValue({
        userId: "user123",
        capsuleId: capsule.id,
        questionId: "question1",
        answerText: "I don't want to say",
        truthScore: 0.3,
        sentimentScore: 0.4,
        analysisDetails: "Potential deception markers found",
        sessionId: expect.any(String),
      })

      mockAnswerRepository.save.mockResolvedValue({})
      mockCapsuleRepository.save.mockResolvedValue({ ...capsule, attemptCount: 1 })

      const result = await service.submitAnswers("capsule123", submitAnswersDto, "user123")

      expect(result.isLocked).toBe(true)
      expect(result.content).toBeUndefined()
      expect(result.overallTruthScore).toBe(0.3)
      expect(result.attemptCount).toBe(1)
    })

    it("should throw an error if maximum attempts exceeded", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        truthThreshold: 0.7,
        maxAttempts: 3,
        attemptCount: 3,
        isLocked: true,
        questions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)

      await expect(service.submitAnswers("capsule123", { answers: [] }, "user123")).rejects.toThrow(
        "Maximum attempts exceeded. Capsule is permanently locked.",
      )
    })

    it("should throw an error if capsule not found", async () => {
      mockCapsuleRepository.findOne.mockResolvedValue(null)

      await expect(service.submitAnswers("nonexistent", { answers: [] }, "user123")).rejects.toThrow(NotFoundException)
    })

    it("should throw an error if user doesn't own the capsule", async () => {
      const capsule = {
        id: "capsule123",
        title: "Test Capsule",
        content: "Secret Content",
        userId: "user123",
        truthThreshold: 0.7,
        maxAttempts: 3,
        attemptCount: 0,
        isLocked: true,
        questions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockCapsuleRepository.findOne.mockResolvedValue(capsule)

      await expect(service.submitAnswers("capsule123", { answers: [] }, "different-user")).rejects.toThrow(
        "You don't have permission to access this capsule",
      )
    })
  })
})
