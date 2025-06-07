import { Module } from "@nestjs/common"
import { MeditationChallengeController } from "./meditation-challenge.controller"
import { MeditationChallengeService } from "./meditation-challenge.service"
import { ConfigModule } from "@nestjs/config"

@Module({
  imports: [ConfigModule],
  controllers: [MeditationChallengeController],
  providers: [MeditationChallengeService],
  exports: [MeditationChallengeService],
})
export class MeditationChallengeModule {}
