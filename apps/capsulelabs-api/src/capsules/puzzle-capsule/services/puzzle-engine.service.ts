import { Injectable, Logger } from "@nestjs/common"
import { PuzzleType, type PuzzleConfig, type PuzzleSolution } from "../entities/puzzle-capsule.entity"
import type { SudokuService } from "./puzzles/sudoku.service"
import type { CipherService } from "./puzzles/cipher.service"
import type { LogicGateService } from "./puzzles/logic-gate.service"
import type { MathPuzzleService } from "./puzzles/math-puzzle.service"
import type { WordPuzzleService } from "./puzzles/word-puzzle.service"

@Injectable()
export class PuzzleEngineService {
  private readonly logger = new Logger(PuzzleEngineService.name)

  constructor(
    private readonly sudokuService: SudokuService,
    private readonly cipherService: CipherService,
    private readonly logicGateService: LogicGateService,
    private readonly mathPuzzleService: MathPuzzleService,
    private readonly wordPuzzleService: WordPuzzleService,
  ) {}

  async validatePuzzleConfig(puzzleType: PuzzleType, config: PuzzleConfig): Promise<boolean> {
    try {
      switch (puzzleType) {
        case PuzzleType.SUDOKU:
          return this.sudokuService.validateConfig(config)
        case PuzzleType.CIPHER:
          return this.cipherService.validateConfig(config)
        case PuzzleType.LOGIC_GATE:
          return this.logicGateService.validateConfig(config)
        case PuzzleType.MATH_PUZZLE:
          return this.mathPuzzleService.validateConfig(config)
        case PuzzleType.WORD_PUZZLE:
          return this.wordPuzzleService.validateConfig(config)
        default:
          return false
      }
    } catch (error) {
      this.logger.error(`Error validating puzzle config for type ${puzzleType}:`, error)
      return false
    }
  }

  async preparePuzzleConfig(puzzleType: PuzzleType, config: PuzzleConfig): Promise<PuzzleConfig> {
    switch (puzzleType) {
      case PuzzleType.SUDOKU:
        return this.sudokuService.preparePuzzle(config)
      case PuzzleType.CIPHER:
        return this.cipherService.preparePuzzle(config)
      case PuzzleType.LOGIC_GATE:
        return this.logicGateService.preparePuzzle(config)
      case PuzzleType.MATH_PUZZLE:
        return this.mathPuzzleService.preparePuzzle(config)
      case PuzzleType.WORD_PUZZLE:
        return this.wordPuzzleService.preparePuzzle(config)
      default:
        throw new Error(`Unsupported puzzle type: ${puzzleType}`)
    }
  }

  async validateSolution(puzzleType: PuzzleType, config: PuzzleConfig, solution: any): Promise<PuzzleSolution> {
    switch (puzzleType) {
      case PuzzleType.SUDOKU:
        return this.sudokuService.validateSolution(config, solution)
      case PuzzleType.CIPHER:
        return this.cipherService.validateSolution(config, solution)
      case PuzzleType.LOGIC_GATE:
        return this.logicGateService.validateSolution(config, solution)
      case PuzzleType.MATH_PUZZLE:
        return this.mathPuzzleService.validateSolution(config, solution)
      case PuzzleType.WORD_PUZZLE:
        return this.wordPuzzleService.validateSolution(config, solution)
      default:
        throw new Error(`Unsupported puzzle type: ${puzzleType}`)
    }
  }

  getPuzzleDataForUser(puzzleType: PuzzleType, config: PuzzleConfig): any {
    switch (puzzleType) {
      case PuzzleType.SUDOKU:
        return this.sudokuService.getPuzzleDataForUser(config)
      case PuzzleType.CIPHER:
        return this.cipherService.getPuzzleDataForUser(config)
      case PuzzleType.LOGIC_GATE:
        return this.logicGateService.getPuzzleDataForUser(config)
      case PuzzleType.MATH_PUZZLE:
        return this.mathPuzzleService.getPuzzleDataForUser(config)
      case PuzzleType.WORD_PUZZLE:
        return this.wordPuzzleService.getPuzzleDataForUser(config)
      default:
        throw new Error(`Unsupported puzzle type: ${puzzleType}`)
    }
  }

  generateHints(puzzleType: PuzzleType, config: PuzzleConfig, maxHints: number): string[] {
    switch (puzzleType) {
      case PuzzleType.SUDOKU:
        return this.sudokuService.generateHints(config, maxHints)
      case PuzzleType.CIPHER:
        return this.cipherService.generateHints(config, maxHints)
      case PuzzleType.LOGIC_GATE:
        return this.logicGateService.generateHints(config, maxHints)
      case PuzzleType.MATH_PUZZLE:
        return this.mathPuzzleService.generateHints(config, maxHints)
      case PuzzleType.WORD_PUZZLE:
        return this.wordPuzzleService.generateHints(config, maxHints)
      default:
        return []
    }
  }
}
