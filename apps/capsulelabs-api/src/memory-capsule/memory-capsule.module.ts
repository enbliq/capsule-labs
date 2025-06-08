import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { MemoryCapsuleController } from "./controllers/memory-capsule.controller"
import { MemoryCapsuleService } from "./services/memory-capsule.service"
import { QuestionGeneratorService } from "./services/question-generator.service"
import { AnswerValidationService } from "./services/answer-validation.service"
import { MemoryCapsule } from "./entities/memory-capsule.entity"
import { CapsuleInteractionLog } from "./entities/capsule-interaction-log.entity"
import { MemoryQuestion } from "./entities/memory-question.entity"
import { DailyLog } from "./entities/daily-log.entity"

@Module({
  imports: [TypeOrmModule.forFeature([MemoryCapsule, CapsuleInteractionLog, MemoryQuestion, DailyLog])],
  controllers: [MemoryCapsuleController],
  providers: [MemoryCapsuleService, QuestionGeneratorService, AnswerValidationService],
  exports: [MemoryCapsuleService],
})
export class MemoryCapsuleModule {}
