import { Module } from "@nestjs/common"
import { TypingTestChallengeService } from "./typing-test-challenge.service"
import { TypingTestChallengeController } from "./typing-test-challenge.controller"

@Module({
  providers: [TypingTestChallengeService],
  controllers: [TypingTestChallengeController],
  exports: [TypingTestChallengeService],
})
export class TypingTestChallengeModule {}
