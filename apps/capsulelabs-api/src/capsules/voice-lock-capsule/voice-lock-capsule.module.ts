import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { VoiceLockCapsuleController } from "./voice-lock-capsule.controller"
import { VoiceLockCapsuleService } from "./voice-lock-capsule.service"
import { VoiceLockCapsule } from "./entities/voice-lock-capsule.entity"
import { VoiceUnlockAttempt } from "./entities/voice-unlock-attempt.entity"
import { VoiceRecognitionService } from "./services/voice-recognition.service"

@Module({
  imports: [TypeOrmModule.forFeature([VoiceLockCapsule, VoiceUnlockAttempt])],
  controllers: [VoiceLockCapsuleController],
  providers: [VoiceLockCapsuleService, VoiceRecognitionService],
  exports: [VoiceLockCapsuleService],
})
export class VoiceLockCapsuleModule {}
