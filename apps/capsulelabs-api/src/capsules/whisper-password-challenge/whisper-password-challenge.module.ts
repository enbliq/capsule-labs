import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { WhisperPasswordChallengeService } from "./whisper-password-challenge.service"
import { WhisperPasswordChallengeController } from "./whisper-password-challenge.controller"

@Module({
  imports: [ConfigModule],
  providers: [WhisperPasswordChallengeService],
  controllers: [WhisperPasswordChallengeController],
  exports: [WhisperPasswordChallengeService],
})
export class WhisperPasswordChallengeModule {}
