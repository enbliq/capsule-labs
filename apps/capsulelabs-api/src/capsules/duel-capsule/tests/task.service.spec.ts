import { Test, type TestingModule } from "@nestjs/testing"
import { TaskService } from "../services/task.service"
import { TaskType } from "../interfaces/duel.interface"

describe("TaskService", () => {
  let service: TaskService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskService],
    }).compile()

    service = module.get<TaskService>(TaskService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("generateTask", () => {
    it("should generate a math task", async () => {
      const task = await service.generateTask(TaskType.MATH)

      expect(task.type).toBe(TaskType.MATH)
      expect(task.question).toContain("What is")
      expect(task.answer).toBeDefined()
      expect(task.timeLimit).toBe(30)
    })

    it("should generate a reaction task", async () => {
      const task = await service.generateTask(TaskType.REACTION)

      expect(task.type).toBe(TaskType.REACTION)
      expect(task.question).toContain("Type the color:")
      expect(task.answer).toBeDefined()
      expect(task.timeLimit).toBe(15)
    })

    it("should generate a puzzle task", async () => {
      const task = await service.generateTask(TaskType.PUZZLE)

      expect(task.type).toBe(TaskType.PUZZLE)
      expect(task.question).toBeDefined()
      expect(task.answer).toBeDefined()
      expect(task.timeLimit).toBe(45)
    })

    it("should generate a trivia task", async () => {
      const task = await service.generateTask(TaskType.TRIVIA)

      expect(task.type).toBe(TaskType.TRIVIA)
      expect(task.question).toBeDefined()
      expect(task.answer).toBeDefined()
      expect(task.options).toBeDefined()
      expect(task.timeLimit).toBe(20)
    })
  })

  describe("validateAnswer", () => {
    it("should validate correct answers", async () => {
      const task = await service.generateTask(TaskType.MATH)
      const isValid = service.validateAnswer(task, task.answer.toString())

      expect(isValid).toBe(true)
    })

    it("should reject incorrect answers", async () => {
      const task = await service.generateTask(TaskType.MATH)
      const isValid = service.validateAnswer(task, "wrong_answer")

      expect(isValid).toBe(false)
    })

    it("should handle case insensitive validation", async () => {
      const task = {
        id: "test",
        type: TaskType.REACTION,
        question: "Type the color: RED",
        answer: "red",
        timeLimit: 15,
      }

      expect(service.validateAnswer(task, "RED")).toBe(true)
      expect(service.validateAnswer(task, "Red")).toBe(true)
      expect(service.validateAnswer(task, "red")).toBe(true)
    })
  })
})
