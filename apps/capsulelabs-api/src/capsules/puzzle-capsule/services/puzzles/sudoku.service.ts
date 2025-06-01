import { Injectable } from "@nestjs/common"
import type { PuzzleConfig, PuzzleSolution } from "../../entities/puzzle-capsule.entity"

@Injectable()
export class SudokuService {
  validateConfig(config: PuzzleConfig): boolean {
    if (!config.grid || !Array.isArray(config.grid)) return false
    if (config.grid.length !== 9) return false

    for (const row of config.grid) {
      if (!Array.isArray(row) || row.length !== 9) return false
      for (const cell of row) {
        if (typeof cell !== "number" || cell < 0 || cell > 9) return false
      }
    }

    return this.isValidSudokuPuzzle(config.grid)
  }

  async preparePuzzle(config: PuzzleConfig): Promise<PuzzleConfig> {
    if (!config.solution) {
      // Generate solution for the given puzzle
      config.solution = this.solveSudoku([...config.grid!.map((row) => [...row])])
    }

    return config
  }

  validateSolution(config: PuzzleConfig, solution: number[][]): PuzzleSolution {
    if (!solution || !Array.isArray(solution) || solution.length !== 9) {
      return {
        isCorrect: false,
        score: 0,
        timeTaken: 0,
        hintsUsed: 0,
        feedback: "Invalid solution format",
        errors: ["Solution must be a 9x9 grid"],
      }
    }

    const errors: string[] = []
    let correctCells = 0
    const totalCells = 81

    // Check each cell
    for (let row = 0; row < 9; row++) {
      if (!Array.isArray(solution[row]) || solution[row].length !== 9) {
        errors.push(`Row ${row + 1} is invalid`)
        continue
      }

      for (let col = 0; col < 9; col++) {
        const userValue = solution[row][col]
        const correctValue = config.solution![row][col]

        if (userValue === correctValue) {
          correctCells++
        } else {
          errors.push(`Cell (${row + 1}, ${col + 1}): expected ${correctValue}, got ${userValue}`)
        }
      }
    }

    const isCorrect = errors.length === 0 && this.isValidSudokuSolution(solution)
    const score = Math.round((correctCells / totalCells) * 100)

    return {
      isCorrect,
      score,
      timeTaken: 0,
      hintsUsed: 0,
      feedback: isCorrect ? "Congratulations! Sudoku solved correctly!" : "Some cells are incorrect",
      errors: errors.slice(0, 10), // Limit error messages
    }
  }

  getPuzzleDataForUser(config: PuzzleConfig): any {
    return {
      grid: config.grid,
      timeLimit: config.timeLimit,
      showProgress: config.showProgress,
    }
  }

  generateHints(config: PuzzleConfig, maxHints: number): string[] {
    const hints: string[] = []
    const solution = config.solution!
    const puzzle = config.grid!

    // Find empty cells and provide hints
    const emptyCells: { row: number; col: number }[] = []
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (puzzle[row][col] === 0) {
          emptyCells.push({ row, col })
        }
      }
    }

    // Generate strategic hints
    for (let i = 0; i < Math.min(maxHints, emptyCells.length); i++) {
      const cell = emptyCells[i]
      const value = solution[cell.row][cell.col]

      if (i === 0) {
        hints.push(`Try looking at row ${cell.row + 1}, column ${cell.col + 1}. What numbers are missing?`)
      } else if (i === 1) {
        hints.push(`Cell (${cell.row + 1}, ${cell.col + 1}) should contain the number ${value}`)
      } else {
        hints.push(`Focus on the 3x3 box containing row ${cell.row + 1}, column ${cell.col + 1}`)
      }
    }

    return hints
  }

  private isValidSudokuPuzzle(grid: number[][]): boolean {
    // Check if the puzzle has a unique solution
    const copy = grid.map((row) => [...row])
    return this.solveSudoku(copy) !== null
  }

  private isValidSudokuSolution(grid: number[][]): boolean {
    // Check rows
    for (let row = 0; row < 9; row++) {
      const seen = new Set<number>()
      for (let col = 0; col < 9; col++) {
        const num = grid[row][col]
        if (num < 1 || num > 9 || seen.has(num)) return false
        seen.add(num)
      }
    }

    // Check columns
    for (let col = 0; col < 9; col++) {
      const seen = new Set<number>()
      for (let row = 0; row < 9; row++) {
        const num = grid[row][col]
        if (seen.has(num)) return false
        seen.add(num)
      }
    }

    // Check 3x3 boxes
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const seen = new Set<number>()
        for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
          for (let col = boxCol * 3; col < boxCol * 3 + 3; col++) {
            const num = grid[row][col]
            if (seen.has(num)) return false
            seen.add(num)
          }
        }
      }
    }

    return true
  }

  private solveSudoku(grid: number[][]): number[][] | null {
    const emptyCell = this.findEmptyCell(grid)
    if (!emptyCell) return grid // Solved

    const [row, col] = emptyCell

    for (let num = 1; num <= 9; num++) {
      if (this.isValidMove(grid, row, col, num)) {
        grid[row][col] = num

        if (this.solveSudoku(grid)) {
          return grid
        }

        grid[row][col] = 0 // Backtrack
      }
    }

    return null
  }

  private findEmptyCell(grid: number[][]): [number, number] | null {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          return [row, col]
        }
      }
    }
    return null
  }

  private isValidMove(grid: number[][], row: number, col: number, num: number): boolean {
    // Check row
    for (let c = 0; c < 9; c++) {
      if (grid[row][c] === num) return false
    }

    // Check column
    for (let r = 0; r < 9; r++) {
      if (grid[r][col] === num) return false
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3
    const boxCol = Math.floor(col / 3) * 3
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (grid[r][c] === num) return false
      }
    }

    return true
  }
}
