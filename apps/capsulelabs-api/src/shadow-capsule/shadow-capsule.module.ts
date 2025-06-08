import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ShadowCapsuleController } from "./controllers/shadow-capsule.controller"
import { ShadowCapsuleService } from "./services/shadow-capsule.service"
import { TwilightCalculationService } from "./services/twilight-calculation.service"
import { ShadowCapsule } from "./entities/shadow-capsule.entity"
import { ShadowCapsuleInteractionLog } from "./entities/shadow-capsule-interaction-log.entity"

@Module({
  imports: [TypeOrmModule.forFeature([ShadowCapsule, ShadowCapsuleInteractionLog])],
  controllers: [ShadowCapsuleController],
  providers: [ShadowCapsuleService, TwilightCalculationService],
  exports: [ShadowCapsuleService, TwilightCalculationService],
})
export class ShadowCapsuleModule {}
