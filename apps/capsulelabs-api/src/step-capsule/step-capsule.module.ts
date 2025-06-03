import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { HttpModule } from "@nestjs/axios"
import { StepChallenge } from "./entities/step-challenge.entity"
import { StepCapsule } from "./entities/step-capsule.entity"
import { ChallengeAttempt } from "./entities/challenge-attempt.entity"
import { GPSPoint } from "./entities/gps-point.entity"
import { StepData } from "./entities/step-data.entity"
import { TokenReward } from "./entities/token-reward.entity"
import { StepChallengeController } from "./controllers/step-challenge.controller"
import { StepCapsuleController } from "./controllers/step-capsule.controller"
import { StepChallengeService } from "./services/step-challenge.service"
import { GPSTrackingService } from "./services/gps-tracking.service"
import { StepCountingService } from "./services/step-counting.service"
import { TokenRewardService } from "./services/token-reward.service"
import { StepCapsuleService } from "./services/step-capsule.service"
import { RouteValidationService } from "./services/route-validation.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([StepChallenge, StepCapsule, ChallengeAttempt, GPSPoint, StepData, TokenReward]),
    HttpModule,
  ],
  controllers: [StepChallengeController, StepCapsuleController],
  providers: [
    StepChallengeService,
    GPSTrackingService,
    StepCountingService,
    TokenRewardService,
    StepCapsuleService,
    RouteValidationService,
  ],
  exports: [StepChallengeService, StepCapsuleService, TokenRewardService],
})
export class StepCapsuleModule {}
