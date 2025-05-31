import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { TruthCapsuleController } from "./truth-capsule.controller"
import { TruthCapsuleService } from "./truth-capsule.service"
import { TruthCapsule } from "./entities/truth-capsule.entity"
import { TruthQuestion } from "./entities/truth-question.entity"
import { TruthAnswer } from "./entities/truth-answer.entity"
import { TruthAnalysisService } from "./services/truth-analysis.service"
import { QuestionGeneratorService } from "./services/question-generator.service"

@Module({
  imports: [TypeOrmModule.forFeature([TruthCapsule, TruthQuestion, TruthAnswer])],
  controllers: [TruthCapsuleController],
  providers: [TruthCapsuleService, TruthAnalysisService, QuestionGeneratorService],
  exports: [TruthCapsuleService],
})
export class TruthCapsuleModule {}
