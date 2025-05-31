import { Module } from "@nestjs/common"
import { PuzzleCapsuleController } from "./controllers/puzzle-capsule.controller"
import { PuzzleCapsuleService } from "./services/puzzle-capsule.service"
import { PuzzleEngineService } from "./services/puzzle-engine.service"
import { SudokuService } from "./services/puzzles/sudoku.service"
import { CipherService } from "./services/puzzles/cipher.service"
import { LogicGateService } from "./services/puzzles/logic-gate.service"
import { MathPuzzleService } from "./services/puzzles/math-puzzle.service"
import { WordPuzzleService } from "./services/puzzles/word-puzzle.service"
import { HintService } from "./services/hint.service"

@Module({
  controllers: [PuzzleCapsuleController],
  providers: [
    PuzzleCapsuleService,
    PuzzleEngineService,
    SudokuService,
    CipherService,
    LogicGateService,
    MathPuzzleService,
    WordPuzzleService,
    HintService,
  ],
  exports: [PuzzleCapsuleService, PuzzleEngineService],
})
export class PuzzleCapsuleModule {}
