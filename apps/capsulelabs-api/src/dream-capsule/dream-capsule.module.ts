import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { DreamCapsuleController } from "./controllers/dream-capsule.controller"
import { DreamLogController } from "./controllers/dream-log.controller"
import { DreamCapsuleService } from "./services/dream-capsule.service"
import { DreamLogService } from "./services/dream-log.service"
import { DreamValidationService } from "./services/dream-validation.service"
import { DreamCapsule } from "./entities/dream-capsule.entity"
import { DreamLog } from "./entities/dream-log.entity"
import { DreamCapsuleInteractionLog } from "./entities/dream-capsule-interaction-log.entity"

@Module({
  imports: [TypeOrmModule.forFeature([DreamCapsule, DreamLog, DreamCapsuleInteractionLog])],
  controllers: [DreamCapsuleController, DreamLogController],
  providers: [DreamCapsuleService, DreamLogService, DreamValidationService],
  exports: [DreamCapsuleService, DreamLogService],
})
export class DreamCapsuleModule {}
