import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { VoiceLockCapsule } from "../entities/voice-lock-capsule.entity"
import type { VoiceRecognitionService } from "../services/voice-recognition.service"

@Injectable()
export class VoiceLockCapsuleSeed {
  constructor(
    private readonly voiceRecognitionService: VoiceRecognitionService,
    @InjectRepository(VoiceLockCapsule)
    private readonly voiceLockCapsuleRepository: Repository<VoiceLockCapsule>,
  ) {}

  async seed(): Promise<void> {
    // Clear existing data
    await this.voiceLockCapsuleRepository.clear()

    // Create mock voice samples
    const voiceSample1 = "base64encodedaudio;text=open sesame"
    const voiceSample2 = "base64encodedaudio;text=hello world"
    const voiceSample3 = "base64encodedaudio;text=the quick brown fox"

    // Generate voice print hashes
    const voicePrintHash1 = this.voiceRecognitionService.generateVoicePrintHash(voiceSample1)
    const voicePrintHash2 = this.voiceRecognitionService.generateVoicePrintHash(voiceSample2)
    const voicePrintHash3 = this.voiceRecognitionService.generateVoicePrintHash(voiceSample3)

    // Seed data with different passphrases
    const capsules = [
      {
        title: "Simple Passphrase Capsule",
        content: "This content is unlocked by saying 'open sesame'.",
        userId: "seed-user-1",
        passphrase: "open sesame",
        voicePrintHash: voicePrintHash1,
        caseSensitive: false,
        confidenceThreshold: 0.7,
      },
      {
        title: "Case Sensitive Capsule",
        content: "This content is unlocked by saying 'Hello World' with exact capitalization.",
        userId: "seed-user-1",
        passphrase: "Hello World",
        voicePrintHash: voicePrintHash2,
        caseSensitive: true,
        confidenceThreshold: 0.7,
      },
      {
        title: "High Confidence Capsule",
        content: "This content requires high confidence in voice recognition.",
        userId: "seed-user-2",
        passphrase: "the quick brown fox",
        voicePrintHash: voicePrintHash3,
        caseSensitive: false,
        confidenceThreshold: 0.9,
      },
    ]

    // Save all capsules
    await this.voiceLockCapsuleRepository.save(capsules)

    console.log("Voice lock capsule seed data created successfully")
  }
}
