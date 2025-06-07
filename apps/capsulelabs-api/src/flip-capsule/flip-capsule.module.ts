import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { FlipCapsuleController } from "./flip-capsule.controller"
import { FlipCapsuleGateway } from "./flip-capsule.gateway"
import { FlipSessionService } from "./services/flip-session.service"
import { OrientationValidatorService } from "./services/orientation-validator.service"
import { NotificationService } from "./services/notification.service"
import { FlipSession, FlipAttempt, FlipCapsuleUnlock, FlipChallengeConfig } from "./entities/flip-capsule.entity"
import { ScheduleModule } from "@nestjs/schedule"

@Module({
  imports: [
    TypeOrmModule.forFeature([FlipSession, FlipAttempt, FlipCapsuleUnlock, FlipChallengeConfig]),
    ScheduleModule.forRoot(),
  ],
  controllers: [FlipCapsuleController],
  providers: [FlipSessionService, OrientationValidatorService, NotificationService, FlipCapsuleGateway],
  exports: [FlipSessionService, OrientationValidatorService, NotificationService],
})
export class FlipCapsuleModule {}
