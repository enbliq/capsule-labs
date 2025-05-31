import { Test, type TestingModule } from "@nestjs/testing"
import { SudokuService } from "../services/puzzles/sudoku.service"

describe("SudokuService", () => {
  let service: SudokuService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SudokuService],
    }).compile()

    service = module.get<SudokuService>(SudokuService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("validateConfig", () => {
    it("should return true for valid sudoku grid", () => {
      const validGrid = Array(9)
        .fill(null)
        .map(() => Array(9).fill(0))
      validGrid[0][0] = 5
      validGrid[0][1] = 3

      const config = { grid: validGrid }
      const result = service.validateConfig(config)

      expect(result).toBe(true)
    })

    it("should return false for invalid grid size", () => {
      const invalidGrid = Array(8)
        .fill(null)
        .map(() => Array(9).fill(0)) // Wrong row count

      const config = { grid: invalidGrid }
      const result = service.validateConfig(config)

      expect(result).toBe(false)
    })

    it("should return false for invalid cell values", () => {
      const invalidGrid = Array(9)
        .fill(null)
        .map(() => Array(9).fill(0))
      invalidGrid[0][0] = 10 // Invalid value (should be 0-9)

      const config = { grid: invalidGrid }
      const result = service.validateConfig(config)

      expect(result).toBe(false)
    })

    it("should return false for non-array grid", () => {
      const config = { grid: "not an array" as any }
      const result = service.validateConfig(config)

      expect(result).toBe(false)
    })
  })

  describe("validateSolution", () => {
    it("should return correct result for valid solution", () => {
      const solution = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9],
      ]

      const config = { solution }
      const result = service.validateSolution(config, solution)

      expect(result.isCorrect).toBe(true)
      expect(result.score).toBe(100)
      expect(result.feedback).toContain("Congratulations")
    })

    it("should return incorrect result for invalid solution", () => {
      const correctSolution = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9],
      ]

      const wrongSolution = [...correctSolution]
      wrongSolution[0][0] = 1 // Wrong value

      const config = { solution: correctSolution }
      const result = service.validateSolution(config, wrongSolution)

      expect(result.isCorrect).toBe(false)
      expect(result.score).toBeLessThan(100)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it("should handle invalid solution format", () => {
      const config = {
        solution: Array(9)
          .fill(null)
          .map(() => Array(9).fill(1)),
      }
      const result = service.validateSolution(config, "invalid" as any)

      expect(result.isCorrect).toBe(false)
      expect(result.score).toBe(0)
      expect(result.errors).toContain("Solution must be a 9x9 grid")
    })
  })

  describe("generateHints", () => {
    it("should generate appropriate number of hints", () => {
      const grid = Array(9)
        .fill(null)
        .map(() => Array(9).fill(0))
      grid[0][0] = 0 // Empty cell
      grid[0][1] = 0 // Empty cell

      const solution = Array(9)
        .fill(null)
        .map(() => Array(9).fill(1))
      solution[0][0] = 5
      solution[0][1] = 3

      const config = { grid, solution }
      const hints = service.generateHints(config, 3)

      expect(hints).toHaveLength(3)
      expect(hints[0]).toContain("row 1")
      expect(hints[1]).toContain("should contain")
    })

    it("should limit hints to available empty cells", () => {
      const grid = Array(9)
        .fill(null)
        .map(() => Array(9).fill(1)) // No empty cells
      const solution = Array(9)
        .fill(null)
        .map(() => Array(9).fill(1))

      const config = { grid, solution }
      const hints = service.generateHints(config, 5)

      expect(hints.length).toBeLessThanOrEqual(5)
    })
  })

  describe("getPuzzleDataForUser", () => {
    it("should return user-safe puzzle data", () => {
      const grid = Array(9)
        .fill(null)
        .map(() => Array(9).fill(0))
      const config = {
        grid,
        solution: Array(9)
          .fill(null)
          .map(() => Array(9).fill(1)),
        timeLimit: 300,
        showProgress: true,
      }

      const userData = service.getPuzzleDataForUser(config)

      expect(userData.grid).toBe(grid)
      expect(userData.timeLimit).toBe(300)
      expect(userData.showProgress).toBe(true)
      expect(userData.solution).toBeUndefined() // Solution should not be exposed
    })
  })
})
