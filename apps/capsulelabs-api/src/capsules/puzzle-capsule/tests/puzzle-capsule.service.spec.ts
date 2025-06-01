import { Test, type TestingModule } from "@nestjs/testing"
import { PuzzleCapsuleService } from "../services/puzzle-capsule.service"
import { PuzzleEngineService } from "../services/puzzle-engine.service"
import { HintService } from "../services/hint.service"
import { SudokuService } from "../services/puzzles/sudoku.service"
import { CipherService } from "../services/puzzles/cipher.service"
import { LogicGateService } from "../services/puzzles/logic-gate.service"
import { MathPuzzleService } from "../services/puzzles/math-puzzle.service"
import { WordPuzzleService } from "../services/puzzles/word-puzzle.service"
import { PuzzleType, PuzzleDifficulty } from "../entities/puzzle-capsule.entity"
import type { CreatePuzzleCapsuleDto, SubmitPuzzleDto } from "../dto/puzzle-capsule.dto"

describe("PuzzleCapsuleService", () => {
  let service: PuzzleCapsuleService
  let puzzleEngine: PuzzleEngineService
  let hintService: HintService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PuzzleCapsuleService,
        PuzzleEngineService,
        HintService,
        SudokuService,
        CipherService,
        LogicGateService,
        MathPuzzleService,
        WordPuzzleService,
      ],
    }).compile()

    service = module.get<PuzzleCapsuleService>(PuzzleCapsuleService)
    puzzleEngine = module.get<PuzzleEngineService>(PuzzleEngineService)
    hintService = module.get<HintService>(HintService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createPuzzleCapsule", () => {
    it("should create a basic puzzle capsule", async () => {
      const createDto: CreatePuzzleCapsuleDto = {
        title: "Test Sudoku",
        description: "A test sudoku puzzle",
        reward: "100 points",
        createdBy: "user123",
        puzzleType: PuzzleType.SUDOKU,
        difficulty: PuzzleDifficulty.EASY,
        puzzleConfig: {
          grid: Array(9)
            .fill(null)
            .map(() => Array(9).fill(0)),
          timeLimit: 300,
        },
      }

      // Mock puzzle engine validation
      jest.spyOn(puzzleEngine, "validatePuzzleConfig").mockResolvedValue(true)
      jest.spyOn(puzzleEngine, "preparePuzzleConfig").mockResolvedValue(createDto.puzzleConfig)

      const puzzle = await service.createPuzzleCapsule(createDto)

      expect(puzzle).toBeDefined()
      expect(puzzle.title).toBe(createDto.title)
      expect(puzzle.puzzleType).toBe(PuzzleType.SUDOKU)
      expect(puzzle.solved).toBe(false)
      expect(puzzle.isActive).toBe(true)
    })

    it("should throw error for invalid puzzle configuration", async () => {
      const createDto: CreatePuzzleCapsuleDto = {
        title: "Invalid Puzzle",
        description: "Invalid configuration",
        reward: "100 points",
        createdBy: "user123",
        puzzleType: PuzzleType.SUDOKU,
        difficulty: PuzzleDifficulty.EASY,
        puzzleConfig: {
          grid: "invalid", // Invalid grid
        },
      }

      // Mock puzzle engine validation to return false
      jest.spyOn(puzzleEngine, "validatePuzzleConfig").mockResolvedValue(false)

      await expect(service.createPuzzleCapsule(createDto)).rejects.toThrow("Invalid puzzle configuration")
    })
  })

  describe("submitPuzzleSolution", () => {
    let puzzle: any
    let submitDto: SubmitPuzzleDto

    beforeEach(async () => {
      const createDto: CreatePuzzleCapsuleDto = {
        title: "Test Puzzle",
        description: "A test puzzle",
        reward: "100 points",
        createdBy: "user123",
        puzzleType: PuzzleType.SUDOKU,
        difficulty: PuzzleDifficulty.EASY,
        puzzleConfig: {
          grid: Array(9)
            .fill(null)
            .map(() => Array(9).fill(0)),
        },
      }

      // Mock puzzle engine
      jest.spyOn(puzzleEngine, "validatePuzzleConfig").mockResolvedValue(true)
      jest.spyOn(puzzleEngine, "preparePuzzleConfig").mockResolvedValue(createDto.puzzleConfig)

      puzzle = await service.createPuzzleCapsule(createDto)
      submitDto = {
        puzzleId: puzzle.id,
        userId: "solver123",
        solution: Array(9)
          .fill(null)
          .map(() => Array(9).fill(1)),
        timeTaken: 120,
        hintsUsed: 0,
      }
    })

    it("should successfully submit correct solution", async () => {
      // Mock puzzle engine validation to return correct solution
      jest.spyOn(puzzleEngine, "validateSolution").mockResolvedValue({
        isCorrect: true,
        score: 100,
        timeTaken: 120,
        hintsUsed: 0,
        feedback: "Correct!",
      })

      const result = await service.submitPuzzleSolution(submitDto)

      expect(result.isCorrect).toBe(true)
      expect(result.score).toBe(100)
      expect(result.feedback).toBe("Correct!")

      // Check that puzzle is marked as solved
      const updatedPuzzle = service.getPuzzle(puzzle.id)
      expect(updatedPuzzle.solved).toBe(true)
      expect(updatedPuzzle.solvedBy).toBe("solver123")
    })

    it("should handle incorrect solution", async () => {
      // Mock puzzle engine validation to return incorrect solution
      jest.spyOn(puzzleEngine, "validateSolution").mockResolvedValue({
        isCorrect: false,
        score: 60,
        timeTaken: 120,
        hintsUsed: 0,
        feedback: "Some errors found",
        errors: ["Cell (1,1) is incorrect"],
      })

      const result = await service.submitPuzzleSolution(submitDto)

      expect(result.isCorrect).toBe(false)
      expect(result.score).toBe(60)
      expect(result.errors).toContain("Cell (1,1) is incorrect")

      // Check that puzzle is not marked as solved
      const updatedPuzzle = service.getPuzzle(puzzle.id)
      expect(updatedPuzzle.solved).toBe(false)
    })

    it("should throw error for non-existent puzzle", async () => {
      submitDto.puzzleId = "non_existent_id"

      await expect(service.submitPuzzleSolution(submitDto)).rejects.toThrow("Puzzle with ID non_existent_id not found")
    })

    it("should throw error for inactive puzzle", async () => {
      // Deactivate puzzle
      service.updatePuzzle(puzzle.id, { isActive: false })

      await expect(service.submitPuzzleSolution(submitDto)).rejects.toThrow("This puzzle is no longer active")
    })

    it("should throw error for already solved puzzle", async () => {
      // Mock first successful solution
      jest.spyOn(puzzleEngine, "validateSolution").mockResolvedValue({
        isCorrect: true,
        score: 100,
        timeTaken: 120,
        hintsUsed: 0,
        feedback: "Correct!",
      })

      // Submit first solution
      await service.submitPuzzleSolution(submitDto)

      // Try to submit again
      await expect(service.submitPuzzleSolution(submitDto)).rejects.toThrow("This puzzle has already been solved")
    })

    it("should enforce maximum attempts limit", async () => {
      // Create puzzle with max attempts
      const limitedPuzzle = await service.createPuzzleCapsule({
        title: "Limited Attempts",
        description: "Only 2 attempts allowed",
        reward: "100 points",
        createdBy: "user123",
        puzzleType: PuzzleType.SUDOKU,
        difficulty: PuzzleDifficulty.EASY,
        puzzleConfig: {
          grid: Array(9)
            .fill(null)
            .map(() => Array(9).fill(0)),
        },
        maxAttempts: 2,
      })

      submitDto.puzzleId = limitedPuzzle.id

      // Mock incorrect solutions
      jest.spyOn(puzzleEngine, "validateSolution").mockResolvedValue({
        isCorrect: false,
        score: 50,
        timeTaken: 120,
        hintsUsed: 0,
        feedback: "Incorrect",
      })

      // Submit first attempt
      await service.submitPuzzleSolution(submitDto)

      // Submit second attempt
      await service.submitPuzzleSolution(submitDto)

      // Third attempt should fail
      await expect(service.submitPuzzleSolution(submitDto)).rejects.toThrow("Maximum attempts exceeded")
    })
  })

  describe("getPuzzleForUser", () => {
    it("should return puzzle data without solution", async () => {
      const createDto: CreatePuzzleCapsuleDto = {
        title: "User Puzzle",
        description: "A puzzle for users",
        reward: "100 points",
        createdBy: "user123",
        puzzleType: PuzzleType.SUDOKU,
        difficulty: PuzzleDifficulty.EASY,
        puzzleConfig: {
          grid: Array(9)
            .fill(null)
            .map(() => Array(9).fill(0)),
          solution: Array(9)
            .fill(null)
            .map(() => Array(9).fill(1)),
        },
      }

      jest.spyOn(puzzleEngine, "validatePuzzleConfig").mockResolvedValue(true)
      jest.spyOn(puzzleEngine, "preparePuzzleConfig").mockResolvedValue(createDto.puzzleConfig)
      jest.spyOn(puzzleEngine, "getPuzzleDataForUser").mockReturnValue({
        grid: createDto.puzzleConfig.grid,
        timeLimit: createDto.puzzleConfig.timeLimit,
      })

      const puzzle = await service.createPuzzleCapsule(createDto)
      const userPuzzle = service.getPuzzleForUser(puzzle.id, "user456")

      expect(userPuzzle.id).toBe(puzzle.id)
      expect(userPuzzle.title).toBe(puzzle.title)
      expect(userPuzzle.puzzleData).toBeDefined()
      expect(userPuzzle.puzzleData.grid).toBeDefined()
      expect(userPuzzle.puzzleData.solution).toBeUndefined() // Solution should not be exposed
    })
  })

  describe("getUserSolvedPuzzles", () => {
    it("should return puzzles solved by user", async () => {
      const createDto: CreatePuzzleCapsuleDto = {
        title: "Solved Puzzle",
        description: "A puzzle to be solved",
        reward: "100 points",
        createdBy: "user123",
        puzzleType: PuzzleType.SUDOKU,
        difficulty: PuzzleDifficulty.EASY,
        puzzleConfig: {
          grid: Array(9)
            .fill(null)
            .map(() => Array(9).fill(0)),
        },
      }

      jest.spyOn(puzzleEngine, "validatePuzzleConfig").mockResolvedValue(true)
      jest.spyOn(puzzleEngine, "preparePuzzleConfig").mockResolvedValue(createDto.puzzleConfig)
      jest.spyOn(puzzleEngine, "validateSolution").mockResolvedValue({
        isCorrect: true,
        score: 100,
        timeTaken: 120,
        hintsUsed: 0,
        feedback: "Correct!",
      })

      const puzzle = await service.createPuzzleCapsule(createDto)

      // Submit solution
      await service.submitPuzzleSolution({
        puzzleId: puzzle.id,
        userId: "solver123",
        solution: Array(9)
          .fill(null)
          .map(() => Array(9).fill(1)),
      })

      const solvedPuzzles = service.getUserSolvedPuzzles("solver123")
      expect(solvedPuzzles).toHaveLength(1)
      expect(solvedPuzzles[0].id).toBe(puzzle.id)
    })

    it("should return empty array for user with no solved puzzles", () => {
      const solvedPuzzles = service.getUserSolvedPuzzles("user_with_no_solutions")
      expect(solvedPuzzles).toEqual([])
    })
  })

  describe("getPuzzleStatistics", () => {
    it("should return correct statistics", async () => {
      const createDto: CreatePuzzleCapsuleDto = {
        title: "Stats Puzzle",
        description: "A puzzle for statistics",
        reward: "100 points",
        createdBy: "user123",
        puzzleType: PuzzleType.SUDOKU,
        difficulty: PuzzleDifficulty.MEDIUM,
        puzzleConfig: {
          grid: Array(9)
            .fill(null)
            .map(() => Array(9).fill(0)),
        },
      }

      jest.spyOn(puzzleEngine, "validatePuzzleConfig").mockResolvedValue(true)
      jest.spyOn(puzzleEngine, "preparePuzzleConfig").mockResolvedValue(createDto.puzzleConfig)

      const puzzle = await service.createPuzzleCapsule(createDto)

      // Mock some attempts
      jest
        .spyOn(puzzleEngine, "validateSolution")
        .mockResolvedValueOnce({
          isCorrect: false,
          score: 60,
          timeTaken: 180,
          hintsUsed: 2,
          feedback: "Incorrect",
        })
        .mockResolvedValueOnce({
          isCorrect: true,
          score: 100,
          timeTaken: 240,
          hintsUsed: 1,
          feedback: "Correct!",
        })

      // Submit attempts
      await service.submitPuzzleSolution({
        puzzleId: puzzle.id,
        userId: "user1",
        solution: "wrong_solution",
        timeTaken: 180,
        hintsUsed: 2,
      })

      await service.submitPuzzleSolution({
        puzzleId: puzzle.id,
        userId: "user2",
        solution: "correct_solution",
        timeTaken: 240,
        hintsUsed: 1,
      })

      const stats = service.getPuzzleStatistics(puzzle.id)

      expect(stats.puzzleId).toBe(puzzle.id)
      expect(stats.totalAttempts).toBe(2)
      expect(stats.uniqueUsers).toBe(2)
      expect(stats.successfulAttempts).toBe(1)
      expect(stats.successRate).toBe(50)
      expect(stats.averageTime).toBe(210) // (180 + 240) / 2
      expect(stats.averageHints).toBe(1.5) // (2 + 1) / 2
      expect(stats.difficulty).toBe(PuzzleDifficulty.MEDIUM)
      expect(stats.type).toBe(PuzzleType.SUDOKU)
    })
  })
})
