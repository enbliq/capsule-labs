import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  UsePipes,
} from "@nestjs/common"
import type { PuzzleCapsuleService } from "../services/puzzle-capsule.service"
import type { HintService } from "../services/hint.service"
import type {
  CreatePuzzleCapsuleDto,
  SubmitPuzzleDto,
  UpdatePuzzleCapsuleDto,
  PuzzleQueryDto,
  GetHintDto,
} from "../dto/puzzle-capsule.dto"

@Controller("puzzle-capsule")
@UsePipes(new ValidationPipe({ transform: true }))
export class PuzzleCapsuleController {
  constructor(
    private readonly puzzleCapsuleService: PuzzleCapsuleService,
    private readonly hintService: HintService,
  ) {}

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  async createPuzzle(@Body() createDto: CreatePuzzleCapsuleDto) {
    const puzzle = await this.puzzleCapsuleService.createPuzzleCapsule(createDto);

    return {
      success: true,
      data: puzzle,
      message: "Puzzle capsule created successfully",
    };
  }

  @Post("submit")
  @HttpCode(HttpStatus.OK)
  async submitSolution(@Body() submitDto: SubmitPuzzleDto) {
    const result = await this.puzzleCapsuleService.submitPuzzleSolution(submitDto)

    return {
      success: result.isCorrect,
      data: {
        isCorrect: result.isCorrect,
        score: result.score,
        feedback: result.feedback,
        errors: result.errors,
      },
      message: result.isCorrect ? "Puzzle solved successfully!" : "Solution incorrect, try again!",
    }
  }

  @Get(":id")
  getPuzzle(@Param("id") id: string, @Query("userId") userId?: string) {
    if (userId) {
      const puzzle = this.puzzleCapsuleService.getPuzzleForUser(id, userId)
      const status = this.puzzleCapsuleService.getPuzzleStatus(this.puzzleCapsuleService.getPuzzle(id))

      return {
        success: true,
        data: {
          ...puzzle,
          status,
        },
      }
    } else {
      const puzzle = this.puzzleCapsuleService.getPuzzle(id)
      const status = this.puzzleCapsuleService.getPuzzleStatus(puzzle)

      return {
        success: true,
        data: {
          puzzle,
          status,
        },
      }
    }
  }

  @Put(":id")
  updatePuzzle(@Param("id") id: string, @Body() updateDto: UpdatePuzzleCapsuleDto) {
    const puzzle = this.puzzleCapsuleService.updatePuzzle(id, updateDto)

    return {
      success: true,
      data: puzzle,
      message: "Puzzle updated successfully",
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePuzzle(@Param("id") id: string) {
    this.puzzleCapsuleService.deletePuzzle(id)
  }

  @Get()
  getAllPuzzles(@Query() query: PuzzleQueryDto) {
    const puzzles = this.puzzleCapsuleService.getAllPuzzles({
      createdBy: query.createdBy,
      puzzleType: query.puzzleType,
      difficulty: query.difficulty,
      solved: query.solved,
      isActive: query.isActive,
      limit: query.limit,
      offset: query.offset,
    })

    return {
      success: true,
      data: puzzles,
      total: puzzles.length,
    }
  }

  @Get("user/:userId/solved")
  getUserSolvedPuzzles(@Param("userId") userId: string) {
    const puzzles = this.puzzleCapsuleService.getUserSolvedPuzzles(userId)

    return {
      success: true,
      data: puzzles,
      total: puzzles.length,
    }
  }

  @Get("user/:userId/attempts/:puzzleId")
  getUserAttempts(@Param("userId") userId: string, @Param("puzzleId") puzzleId: string) {
    const attempts = this.puzzleCapsuleService.getUserAttempts(userId, puzzleId)

    return {
      success: true,
      data: attempts,
      total: attempts.length,
    }
  }

  @Post("hint")
  @HttpCode(HttpStatus.OK)
  getHint(@Body() getHintDto: GetHintDto) {
    const hint = this.hintService.getHint(getHintDto.puzzleId, getHintDto.userId, getHintDto.hintNumber)

    if (!hint) {
      return {
        success: false,
        message: "Hint not available",
      }
    }

    return {
      success: true,
      data: hint,
      message: "Hint retrieved successfully",
    }
  }

  @Get(":id/hints")
  getAvailableHints(@Param("id") puzzleId: string, @Query("userId") userId: string) {
    const hints = this.hintService.getAvailableHints(puzzleId, userId)

    return {
      success: true,
      data: hints,
      total: hints.length,
    }
  }

  @Get(":id/statistics")
  getPuzzleStatistics(@Param("id") puzzleId: string) {
    const stats = this.puzzleCapsuleService.getPuzzleStatistics(puzzleId)

    return {
      success: true,
      data: stats,
    }
  }
}
