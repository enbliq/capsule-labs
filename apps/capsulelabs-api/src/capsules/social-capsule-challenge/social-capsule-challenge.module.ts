import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { SocialCapsuleChallengeService } from "./social-capsule-challenge.service"
import { SocialCapsuleChallengeController } from "./social-capsule-challenge.controller"

@Module({
  imports: [ConfigModule],
  providers: [SocialCapsuleChallengeService],
  controllers: [SocialCapsuleChallengeController],
  exports: [SocialCapsuleChallengeService],
})
export class SocialCapsuleChallengeModule {}
