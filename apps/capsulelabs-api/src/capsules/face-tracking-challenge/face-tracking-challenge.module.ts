import { Module } from "@nestjs/common"
import { FaceTrackingChallengeController } from "./face-tracking-challenge.controller"
import { FaceTrackingChallengeService } from "./face-tracking-challenge.service"
import { ConfigModule } from "@nestjs/config"

@Module({
  imports: [ConfigModule],
  controllers: [FaceTrackingChallengeController],
  providers: [FaceTrackingChallengeService],
  exports: [FaceTrackingChallengeService],
})
export class FaceTrackingChallengeModule {}
