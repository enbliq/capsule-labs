import { Injectable } from "@nestjs/common"
import type { PuzzleConfig, PuzzleSolution } from "../../entities/puzzle-capsule.entity"

@Injectable()
export class WordPuzzleService {
  validateConfig(config: PuzzleConfig): boolean {
    if (!config.words || !Array.isArray(config.words)) return false
    if (!config.clues || !Array.isArray(config.clues)) return false
    if (!config.gridSize || typeof config.gridSize !== "object") return false
    if (config.words.length !== config.clues.length) return false

    return (
      config.words.every((word) => typeof word === "string" && word.length > 0) &&
      config.clues.every((clue) => typeof clue === "string" && clue.length > 0)
    )
  }

  async preparePuzzle(config: PuzzleConfig): Promise<PuzzleConfig> {
    // Generate crossword grid layout
    const grid = this.generateCrosswordGrid(config.words!, config.gridSize!)
    config.grid = grid

    return config
  }

  validateSolution(config: PuzzleConfig, solution: Record<string, string>): PuzzleSolution {
    if (!solution || typeof solution !== "object") {
      return {
        isCorrect: false,
        score: 0,
        timeTaken: 0,
        hintsUsed: 0,
        feedback: "Solution must be an object with word answers",
        errors: ["Invalid solution format"],
      }
    }

    const words = config.words!
    const clues = config.clues!
    let correctWords = 0
    const errors: string[] = []

    for (let i = 0; i < words.length; i++) {
      const expectedWord = words[i].toLowerCase()
      const userWord = (solution[`word${i}`] || solution[clues[i]] || "").toLowerCase()

      if (userWord === expectedWord) {
        correctWords++
      } else {
        errors.push(`Clue "${clues[i]}": expected "${words[i]}", got "${userWord || "(empty)"}"`)
      }
    }

    const isCorrect = correctWords === words.length
    const score = words.length > 0 ? Math.round((correctWords / words.length) * 100) : 0

    return {
      isCorrect,
      score,
      timeTaken: 0,
      hintsUsed: 0,
      feedback: isCorrect
        ? "Fantastic! You've completed the crossword puzzle!"
        : `You got ${correctWords} out of ${words.length} words correct.`,
      errors: errors.slice(0, 5), // Limit error messages
    }
  }

  getPuzzleDataForUser(config: PuzzleConfig): any {
    return {
      clues: config.clues,
      gridSize: config.gridSize,
      grid: config.grid,
      timeLimit: config.timeLimit,
      wordCount: config.words!.length,
    }
  }

  generateHints(config: PuzzleConfig, maxHints: number): string[] {
    const hints: string[] = []
    const words = config.words!
    const clues = config.clues!

    if (words.length > 0) {
      hints.push(`The first word is ${words[0].length} letters long`)
    }

    if (maxHints > 1 && words.length > 0) {
      hints.push(`First word starts with "${words[0][0].toUpperCase()}"`)
    }

    if (maxHints > 2 && words.length > 1) {
      hints.push(`Second word: "${words[1]}"`)
    }

    if (maxHints > 3) {
      hints.push("Look for intersecting letters between words")
    }

    return hints.slice(0, maxHints)
  }

  private generateCrosswordGrid(words: string[], gridSize: { rows: number; cols: number }): string[][] {
    // Simple crossword grid generator
    const grid: string[][] = Array(gridSize.rows)
      .fill(null)
      .map(() => Array(gridSize.cols).fill(""))

    // Place words in grid (simplified implementation)
    let currentRow = 0
    let currentCol = 0

    for (let i = 0; i < words.length; i++) {
      const word = words[i].toUpperCase()
      const isHorizontal = i % 2 === 0

      if (isHorizontal) {
        // Place horizontally
        if (currentCol + word.length <= gridSize.cols) {
          for (let j = 0; j < word.length; j++) {
            grid[currentRow][currentCol + j] = word[j]
          }
          currentRow += 2
        }
      } else {
        // Place vertically
        if (currentRow + word.length <= gridSize.rows) {
          for (let j = 0; j < word.length; j++) {
            grid[currentRow + j][currentCol] = word[j]
          }
          currentCol += 2
        }
      }

      // Reset position if we've gone too far
      if (currentRow >= gridSize.rows) {
        currentRow = 1
        currentCol += 3
      }
      if (currentCol >= gridSize.cols) {
        currentCol = 1
        currentRow += 3
      }
    }

    return grid
  }
}
