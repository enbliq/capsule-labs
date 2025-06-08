import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { HttpModule } from "@nestjs/axios"
import { RiddleCapsuleController } from "./controllers/riddle-capsule.controller"
import { RiddleController } from "./controllers/riddle.controller"
import { RiddleCapsuleService } from "./services/riddle-capsule.service"
import { RiddleService } from "./services/riddle.service"
import { RiddleValidationService } from "./services/riddle-validation.service"
import { RiddleCapsule } from "./entities/riddle-capsule.entity"
import { Riddle } from "./entities/riddle.entity"
import { RiddleAttempt } from "./entities/riddle-attempt.entity"
import { RiddleCapsuleInteractionLog } from "./entities/riddle-capsule-interaction-log.entity"

@Module({
  imports: [TypeOrmModule.forFeature([RiddleCapsule, Riddle, RiddleAttempt, RiddleCapsuleInteractionLog]), HttpModule],
  controllers: [RiddleCapsuleController, RiddleController],
  providers: [RiddleCapsuleService, RiddleService, RiddleValidationService],
  exports: [RiddleCapsuleService, RiddleService],
})
export class RiddleCapsuleModule {}
