import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { StreakCapsuleController } from "./controllers/streak-capsule.controller"
import { StreakCapsuleService } from "./services/streak-capsule.service"
import { CheckInService } from "./services/check-in.service"
import { StreakCalculationService } from "./services/streak-calculation.service"
import { StreakCapsule } from "./entities/streak-capsule.entity"
import { DailyCheckIn } from "./entities/daily-check-in.entity"
import { StreakCapsuleInteractionLog } from "./entities/streak-capsule-interaction-log.entity"

@Module({
  imports: [TypeOrmModule.forFeature([StreakCapsule, DailyCheckIn, StreakCapsuleInteractionLog])],
  controllers: [StreakCapsuleController],
  providers: [StreakCapsuleService, CheckInService, StreakCalculationService],
  exports: [StreakCapsuleService, CheckInService],
})
export class StreakCapsuleModule {}
