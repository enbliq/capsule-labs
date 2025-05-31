import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { VoiceLockCapsule } from "./entities/voice-lock-capsule.entity"
import { VoiceUnlockAttempt } from "./entities/voice-unlock-attempt.entity"
import type { VoiceRecognitionService } from "./services/voice-recognition.service"
import type { CreateVoiceLockCapsuleDto } from "./dto/create-voice-lock-capsule.dto"
import type { SubmitVoiceDto } from "./dto/submit-voice.dto"
import type { ViewVoiceLockCapsuleDto } from "./dto/view-voice-lock-capsule.dto"

@Injectable()
export class VoiceLockCapsuleService {
  constructor(
    @InjectRepository(VoiceLockCapsule)
    private readonly voiceLockCapsuleRepository: Repository<VoiceLockCapsule>,
    @InjectRepository(VoiceUnlockAttempt)
    private readonly voiceUnlockAttemptRepository: Repository<VoiceUnlockAttempt>,
    private readonly voiceRecognitionService: VoiceRecognitionService,
  ) {}

  async create(createVoiceLockCapsuleDto: CreateVoiceLockCapsuleDto, userId: string): Promise<VoiceLockCapsule> {
    // Generate voice print hash from the provided voice sample
    const voicePrintHash = this.voiceRecognitionService.generateVoicePrintHash(createVoiceLockCapsuleDto.voiceSample)

    const capsule = this.voiceLockCapsuleRepository.create({
      title: createVoiceLockCapsuleDto.title,
      content: createVoiceLockCapsuleDto.content,
      userId,
      passphrase: createVoiceLockCapsuleDto.passphrase,
      voicePrintHash,
      caseSensitive: createVoiceLockCapsuleDto.caseSensitive ?? false,
      confidenceThreshold: createVoiceLockCapsuleDto.confidenceThreshold ?? 0.7,
    })

    return this.voiceLockCapsuleRepository.save(capsule)
  }

  async findOne(id: string): Promise<VoiceLockCapsule> {
    const capsule = await this.voiceLockCapsuleRepository.findOne({ where: { id } })

    if (!capsule) {
      throw new NotFoundException(`Voice lock capsule with ID ${id} not found`)
    }

    return capsule
  }

  async findAll(userId: string): Promise<VoiceLockCapsule[]> {
    return this.voiceLockCapsuleRepository.find({
      where: { userId },
    })
  }

  async unlockCapsule(id: string, submitVoiceDto: SubmitVoiceDto, userId: string): Promise<ViewVoiceLockCapsuleDto> {
    const capsule = await this.findOne(id)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule")
    }

    // Recognize speech from the voice sample
    const recognitionResult = this.voiceRecognitionService.recognizeSpeech(submitVoiceDto.voiceSample)

    // Compare the recognized text with the passphrase
    const phraseMatchScore = this.voiceRecognitionService.comparePhrases(
      recognitionResult.recognizedText,
      capsule.passphrase,
      capsule.caseSensitive,
    )

    // Compare the voice print
    const voiceMatchResult = this.voiceRecognitionService.compareVoicePrint(
      submitVoiceDto.voiceSample,
      capsule.voicePrintHash,
    )

    // Determine if the unlock attempt is successful
    // Both the phrase and voice must match with sufficient confidence
    const isSuccessful =
      phraseMatchScore >= 0.8 &&
      recognitionResult.confidenceScore >= capsule.confidenceThreshold &&
      voiceMatchResult.matchScore >= capsule.confidenceThreshold

    // Log the unlock attempt
    await this.logUnlockAttempt(
      capsule.id,
      userId,
      recognitionResult.recognizedText,
      recognitionResult.confidenceScore,
      voiceMatchResult.matchScore,
      isSuccessful,
    )

    // Create the response DTO
    const response: ViewVoiceLockCapsuleDto = {
      id: capsule.id,
      title: capsule.title,
      isLocked: !isSuccessful,
      recognizedText: recognitionResult.recognizedText,
      confidenceScore: recognitionResult.confidenceScore,
      voiceMatchScore: voiceMatchResult.matchScore,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }

    // Only include content and passphrase if the unlock is successful
    if (isSuccessful) {
      response.content = capsule.content
      response.passphrase = capsule.passphrase
    }

    return response
  }

  private async logUnlockAttempt(
    capsuleId: string,
    userId: string,
    recognizedText: string,
    confidenceScore: number,
    voiceMatchScore: number,
    successful: boolean,
  ): Promise<void> {
    const attempt = this.voiceUnlockAttemptRepository.create({
      capsuleId,
      userId,
      recognizedText,
      confidenceScore,
      voiceMatchScore,
      successful,
    })

    await this.voiceUnlockAttemptRepository.save(attempt)
  }

  async getUnlockAttempts(capsuleId: string, userId: string): Promise<VoiceUnlockAttempt[]> {
    const capsule = await this.findOne(capsuleId)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule's history")
    }

    return this.voiceUnlockAttemptRepository.find({
      where: { capsuleId },
      order: { createdAt: "DESC" },
    })
  }
}
