import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common"
import type { PuzzleCapsule, PuzzleAttempt, PuzzleSolution } from "../entities/puzzle-capsule.entity"
import { PuzzleStatus, type PuzzleType } from "../entities/puzzle-capsule.entity"
import type { CreatePuzzleCapsuleDto, SubmitPuzzleDto, UpdatePuzzleCapsuleDto } from "../dto/puzzle-capsule.dto"
import type { PuzzleEngineService } from "./puzzle-engine.service"
import type { HintService } from "./hint.service"

@Injectable()
export class PuzzleCapsuleService {
  private readonly logger = new Logger(PuzzleCapsuleService.name)
  private puzzles = new Map<string, PuzzleCapsule>()
  private userAttempts = new Map<string, Map<string, PuzzleAttempt[]>>() // userId -> puzzleId -> attempts

  constructor(
    private readonly puzzleEngine: PuzzleEngineService,
    private readonly hintService: HintService,
  ) {}

  async createPuzzleCapsule(createDto: CreatePuzzleCapsuleDto): Promise<PuzzleCapsule> {
    // Validate puzzle configuration
    const isValidConfig = await this.puzzleEngine.validatePuzzleConfig(createDto.puzzleType, createDto.puzzleConfig)
    if (!isValidConfig) {
      throw new BadRequestException("Invalid puzzle configuration")
    }

    // Generate puzzle solution if needed
    const puzzleConfig = await this.puzzleEngine.preparePuzzleConfig(createDto.puzzleType, createDto.puzzleConfig)

    const puzzleId = this.generatePuzzleId()
    const puzzle: PuzzleCapsule = {
      id: puzzleId,
      title: createDto.title,
      description: createDto.description,
      reward: createDto.reward,
      createdBy: createDto.createdBy,
      createdAt: new Date(),
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : undefined,

      puzzleType: createDto.puzzleType,
      puzzleConfig,
      difficulty: createDto.difficulty,

      solved: false,
      attempts: [],

      hintsEnabled: createDto.hintsEnabled ?? true,
      maxHints: createDto.maxHints ?? 3,
      hintPenalty: createDto.hintPenalty ?? 10,

      maxAttempts: createDto.maxAttempts,
      retryDelay: createDto.retryDelay ?? 30,

      isActive: true,
    }

    this.puzzles.set(puzzleId, puzzle)

    // Generate hints if enabled
    if (puzzle.hintsEnabled) {
      await this.hintService.generateHints(puzzle)
    }

    this.logger.log(`Created puzzle capsule ${puzzleId} of type ${createDto.puzzleType}`)
    return puzzle
  }

  async submitPuzzleSolution(submitDto: SubmitPuzzleDto): Promise<PuzzleSolution> {
    const { puzzleId, userId, solution, timeTaken = 0, hintsUsed = 0 } = submitDto

    const puzzle = this.puzzles.get(puzzleId)
    if (!puzzle) {
      throw new NotFoundException(`Puzzle with ID ${puzzleId} not found`)
    }

    // Check if puzzle is active
    if (!puzzle.isActive) {
      throw new BadRequestException("This puzzle is no longer active")
    }

    // Check if expired
    if (puzzle.expiresAt && new Date() > puzzle.expiresAt) {
      throw new BadRequestException("This puzzle has expired")
    }

    // Check if already solved
    if (puzzle.solved) {
      throw new BadRequestException("This puzzle has already been solved")
    }

    // Check attempt limits
    const userAttempts = this.getUserAttempts(userId, puzzleId)
    if (puzzle.maxAttempts && userAttempts.length >= puzzle.maxAttempts) {
      throw new BadRequestException("Maximum attempts exceeded")
    }

    // Check retry delay
    if (userAttempts.length > 0 && puzzle.retryDelay) {
      const lastAttempt = userAttempts[userAttempts.length - 1]
      const timeSinceLastAttempt = (Date.now() - lastAttempt.submittedAt.getTime()) / 1000
      if (timeSinceLastAttempt < puzzle.retryDelay) {
        throw new BadRequestException(
          `Please wait ${puzzle.retryDelay - Math.floor(timeSinceLastAttempt)} seconds before trying again`,
        )
      }
    }

    // Validate solution
    const puzzleSolution = await this.puzzleEngine.validateSolution(puzzle.puzzleType, puzzle.puzzleConfig, solution)

    // Create attempt record
    const attempt: PuzzleAttempt = {
      id: this.generateAttemptId(),
      userId,
      submittedAt: new Date(),
      solution,
      isCorrect: puzzleSolution.isCorrect,
      timeTaken,
      hintsUsed,
      score: puzzleSolution.score,
    }

    // Store attempt
    this.addUserAttempt(userId, puzzleId, attempt)
    puzzle.attempts.push(attempt)

    // If correct, mark as solved
    if (puzzleSolution.isCorrect) {
      puzzle.solved = true
      puzzle.solvedBy = userId
      puzzle.solvedAt = new Date()

      this.logger.log(`User ${userId} solved puzzle ${puzzleId}`)
    }

    return puzzleSolution
  }

  getPuzzle(puzzleId: string): PuzzleCapsule {
    const puzzle = this.puzzles.get(puzzleId)
    if (!puzzle) {
      throw new NotFoundException(`Puzzle with ID ${puzzleId} not found`)
    }
    return puzzle
  }

  getPuzzleForUser(puzzleId: string, userId: string): any {
    const puzzle = this.getPuzzle(puzzleId)

    // Return puzzle without solution data
    const userPuzzle = {
      id: puzzle.id,
      title: puzzle.title,
      description: puzzle.description,
      reward: puzzle.reward,
      puzzleType: puzzle.puzzleType,
      difficulty: puzzle.difficulty,
      hintsEnabled: puzzle.hintsEnabled,
      maxHints: puzzle.maxHints,
      maxAttempts: puzzle.maxAttempts,
      retryDelay: puzzle.retryDelay,
      solved: puzzle.solved,
      expiresAt: puzzle.expiresAt,
      userAttempts: this.getUserAttempts(userId, puzzleId).length,
      puzzleData: this.puzzleEngine.getPuzzleDataForUser(puzzle.puzzleType, puzzle.puzzleConfig),
    }

    return userPuzzle
  }

  updatePuzzle(puzzleId: string, updateDto: UpdatePuzzleCapsuleDto): PuzzleCapsule {
    const puzzle = this.getPuzzle(puzzleId)

    if (updateDto.title !== undefined) puzzle.title = updateDto.title
    if (updateDto.description !== undefined) puzzle.description = updateDto.description
    if (updateDto.reward !== undefined) puzzle.reward = updateDto.reward
    if (updateDto.expiresAt !== undefined) {
      puzzle.expiresAt = updateDto.expiresAt ? new Date(updateDto.expiresAt) : undefined
    }
    if (updateDto.isActive !== undefined) puzzle.isActive = updateDto.isActive
    if (updateDto.hintsEnabled !== undefined) puzzle.hintsEnabled = updateDto.hintsEnabled
    if (updateDto.maxHints !== undefined) puzzle.maxHints = updateDto.maxHints

    this.logger.log(`Updated puzzle ${puzzleId}`)
    return puzzle
  }

  deletePuzzle(puzzleId: string): void {
    const puzzle = this.getPuzzle(puzzleId)
    this.puzzles.delete(puzzleId)
    this.logger.log(`Deleted puzzle ${puzzleId}`)
  }

  getAllPuzzles(filters?: {
    createdBy?: string
    puzzleType?: PuzzleType
    difficulty?: string
    solved?: boolean
    isActive?: boolean
    limit?: number
    offset?: number
  }): PuzzleCapsule[] {
    let puzzles = Array.from(this.puzzles.values())

    if (filters) {
      if (filters.createdBy) {
        puzzles = puzzles.filter((p) => p.createdBy === filters.createdBy)
      }
      if (filters.puzzleType) {
        puzzles = puzzles.filter((p) => p.puzzleType === filters.puzzleType)
      }
      if (filters.difficulty) {
        puzzles = puzzles.filter((p) => p.difficulty === filters.difficulty)
      }
      if (filters.solved !== undefined) {
        puzzles = puzzles.filter((p) => p.solved === filters.solved)
      }
      if (filters.isActive !== undefined) {
        puzzles = puzzles.filter((p) => p.isActive === filters.isActive)
      }

      // Pagination
      const offset = filters.offset || 0
      const limit = filters.limit || 50
      puzzles = puzzles.slice(offset, offset + limit)
    }

    return puzzles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getUserSolvedPuzzles(userId: string): PuzzleCapsule[] {
    return Array.from(this.puzzles.values()).filter((p) => p.solvedBy === userId)
  }

  getUserAttempts(userId: string, puzzleId: string): PuzzleAttempt[] {
    const userAttempts = this.userAttempts.get(userId)
    if (!userAttempts) return []

    return userAttempts.get(puzzleId) || []
  }

  private addUserAttempt(userId: string, puzzleId: string, attempt: PuzzleAttempt): void {
    if (!this.userAttempts.has(userId)) {
      this.userAttempts.set(userId, new Map())
    }

    const userPuzzleAttempts = this.userAttempts.get(userId)!
    if (!userPuzzleAttempts.has(puzzleId)) {
      userPuzzleAttempts.set(puzzleId, [])
    }

    userPuzzleAttempts.get(puzzleId)!.push(attempt)
  }

  getPuzzleStatus(puzzle: PuzzleCapsule): PuzzleStatus {
    if (!puzzle.isActive) return PuzzleStatus.INACTIVE
    if (puzzle.solved) return PuzzleStatus.SOLVED
    if (puzzle.expiresAt && new Date() > puzzle.expiresAt) return PuzzleStatus.EXPIRED
    return PuzzleStatus.ACTIVE
  }

  getPuzzleStatistics(puzzleId: string): any {
    const puzzle = this.getPuzzle(puzzleId)

    const totalAttempts = puzzle.attempts.length
    const uniqueUsers = new Set(puzzle.attempts.map((a) => a.userId)).size
    const successfulAttempts = puzzle.attempts.filter((a) => a.isCorrect).length
    const averageTime =
      puzzle.attempts.length > 0 ? puzzle.attempts.reduce((sum, a) => sum + a.timeTaken, 0) / puzzle.attempts.length : 0
    const averageHints =
      puzzle.attempts.length > 0 ? puzzle.attempts.reduce((sum, a) => sum + a.hintsUsed, 0) / puzzle.attempts.length : 0

    return {
      puzzleId,
      totalAttempts,
      uniqueUsers,
      successfulAttempts,
      successRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0,
      averageTime: Math.round(averageTime),
      averageHints: Math.round(averageHints * 10) / 10,
      difficulty: puzzle.difficulty,
      type: puzzle.puzzleType,
    }
  }

  private generatePuzzleId(): string {
    return `puzzle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateAttemptId(): string {
    return `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
