import { Injectable, Logger } from "@nestjs/common"
import type { PuzzleCapsule, PuzzleHint } from "../entities/puzzle-capsule.entity"
import type { PuzzleEngineService } from "./puzzle-engine.service"

@Injectable()
export class HintService {
  private readonly logger = new Logger(HintService.name)
  private hints = new Map<string, PuzzleHint[]>() // puzzleId -> hints
  private userHints = new Map<string, Map<string, number>>() // userId -> puzzleId -> hintsUsed

  constructor(private readonly puzzleEngine: PuzzleEngineService) {}

  async generateHints(puzzle: PuzzleCapsule): Promise<void> {
    if (!puzzle.hintsEnabled) return

    const hintTexts = this.puzzleEngine.generateHints(puzzle.puzzleType, puzzle.puzzleConfig, puzzle.maxHints)

    const puzzleHints: PuzzleHint[] = hintTexts.map((content, index) => ({
      id: this.generateHintId(),
      puzzleId: puzzle.id,
      hintNumber: index + 1,
      content,
      penalty: puzzle.hintPenalty || 10,
    }))

    this.hints.set(puzzle.id, puzzleHints)
    this.logger.log(`Generated ${puzzleHints.length} hints for puzzle ${puzzle.id}`)
  }

  getHint(puzzleId: string, userId: string, hintNumber: number): PuzzleHint | null {
    const puzzleHints = this.hints.get(puzzleId)
    if (!puzzleHints) return null

    const hint = puzzleHints.find((h) => h.hintNumber === hintNumber)
    if (!hint) return null

    // Track hint usage
    this.trackHintUsage(userId, puzzleId, hintNumber)

    // Mark hint as revealed
    hint.revealedAt = new Date()

    this.logger.log(`User ${userId} requested hint ${hintNumber} for puzzle ${puzzleId}`)
    return hint
  }

  getUserHintsUsed(userId: string, puzzleId: string): number {
    const userHints = this.userHints.get(userId)
    if (!userHints) return 0

    return userHints.get(puzzleId) || 0
  }

  getAllHintsForPuzzle(puzzleId: string): PuzzleHint[] {
    return this.hints.get(puzzleId) || []
  }

  getAvailableHints(puzzleId: string, userId: string): PuzzleHint[] {
    const allHints = this.getAllHintsForPuzzle(puzzleId)
    const hintsUsed = this.getUserHintsUsed(userId, puzzleId)

    return allHints.slice(0, hintsUsed + 1) // User can see current hint + next one
  }

  calculateHintPenalty(userId: string, puzzleId: string, baseReward: number): number {
    const hintsUsed = this.getUserHintsUsed(userId, puzzleId)
    const puzzleHints = this.hints.get(puzzleId)

    if (!puzzleHints || hintsUsed === 0) return baseReward

    let totalPenalty = 0
    for (let i = 0; i < Math.min(hintsUsed, puzzleHints.length); i++) {
      totalPenalty += puzzleHints[i].penalty
    }

    const penaltyAmount = (baseReward * totalPenalty) / 100
    return Math.max(0, baseReward - penaltyAmount)
  }

  private trackHintUsage(userId: string, puzzleId: string, hintNumber: number): void {
    if (!this.userHints.has(userId)) {
      this.userHints.set(userId, new Map())
    }

    const userPuzzleHints = this.userHints.get(userId)!
    const currentHints = userPuzzleHints.get(puzzleId) || 0

    if (hintNumber > currentHints) {
      userPuzzleHints.set(puzzleId, hintNumber)
    }
  }

  private generateHintId(): string {
    return `hint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
