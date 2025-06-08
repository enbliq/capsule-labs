import { Module } from "@nestjs/common"
import { ReactionChallengeController } from "./reaction-challenge.controller"
import { ReactionChallengeService } from "./reaction-challenge.service"
import { ConfigModule } from "@nestjs/config"

@Module({
  imports: [ConfigModule],
  controllers: [ReactionChallengeController],
  providers: [ReactionChallengeService],
  exports: [ReactionChallengeService],
})
export class ReactionChallengeModule {}
