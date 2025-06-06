import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { EchoCapsule } from "../entities/echo-capsule.entity"
import type { CreateEchoCapsuleDto } from "../dto/create-echo-capsule.dto"
import type { SubmitAudioDto, AudioAnalysisResult } from "../dto/submit-audio.dto"
import type { AudioAnalysisService } from "./audio-analysis.service"

interface UnlockAttempt {
  timestamp: Date
  confidence: number
  detected: boolean
  audioFingerprint: string
  metadata?: any
}

@Injectable()
export class EchoCapsuleService {
  private readonly logger = new Logger(EchoCapsuleService.name)

  constructor(
    private readonly capsuleRepository: Repository<EchoCapsule>,
    private readonly audioAnalysisService: AudioAnalysisService,
  ) {}

  /**
   * Create a new echo capsule
   */
  async create(createDto: CreateEchoCapsuleDto): Promise<EchoCapsule> {
    const capsule = this.capsuleRepository.create({
      soundPattern: createDto.soundPattern,
      title: createDto.title,
      content: createDto.content,
      createdBy: createDto.createdBy,
      confidenceThreshold: createDto.confidenceThreshold || 0.8,
      referenceAudioPath: createDto.referenceAudioPath,
      unlocked: false,
      unlockedAt: null,
      unlockAttempts: [],
    })

    const savedCapsule = await this.capsuleRepository.save(capsule)
    this.logger.log(`Created new echo capsule: ${savedCapsule.id}`)

    return savedCapsule
  }

  /**
   * Submit audio for capsule unlock attempt
   */
  async submitAudio(
    submitDto: SubmitAudioDto,
    audioBuffer: Buffer,
    originalFilename?: string,
  ): Promise<AudioAnalysisResult> {
    const capsule = await this.capsuleRepository.findOne({
      where: { id: submitDto.capsuleId },
    })

    if (!capsule) {
      throw new NotFoundException(`Echo capsule with ID ${submitDto.capsuleId} not found`)
    }

    if (capsule.unlocked) {
      return {
        detected: true,
        confidence: 1.0,
        detectedPattern: capsule.soundPattern,
        unlocked: true,
        analysis: {
          message: "Capsule was already unlocked",
          unlockedAt: capsule.unlockedAt,
        },
      }
    }

    // Validate audio specifications
    const audioFormat = submitDto.audioFormat || this.detectAudioFormat(originalFilename)
    const validation = this.audioAnalysisService.validateAudioSpecs(audioBuffer, audioFormat)

    if (!validation.valid) {
      throw new BadRequestException(`Invalid audio file: ${validation.issues.join(", ")}`)
    }

    try {
      // Analyze the submitted audio
      const features = await this.audioAnalysisService.analyzeAudio(audioBuffer, audioFormat)

      // Detect the target sound pattern
      const detection = await this.audioAnalysisService.detectSoundPattern(features, capsule.soundPattern)

      // Generate fingerprint for this attempt
      const audioFingerprint = await this.audioAnalysisService.generateFingerprint(features)

      // Record the unlock attempt
      const attempt: UnlockAttempt = {
        timestamp: new Date(),
        confidence: detection.confidence,
        detected: detection.detected,
        audioFingerprint,
        metadata: {
          originalFilename,
          audioFormat,
          duration: features.duration,
          submittedMetadata: submitDto.metadata,
        },
      }

      // Check if unlock should occur
      const shouldUnlock = detection.detected && detection.confidence >= capsule.confidenceThreshold

      if (shouldUnlock) {
        capsule.unlocked = true
        capsule.unlockedAt = new Date()
        this.logger.log(`Unlocked echo capsule ${capsule.id} with confidence ${detection.confidence}`)
      }

      // Update unlock attempts
      const currentAttempts = capsule.unlockAttempts || []
      capsule.unlockAttempts = [...currentAttempts, attempt]

      await this.capsuleRepository.save(capsule)

      return {
        detected: detection.detected,
        confidence: detection.confidence,
        detectedPattern: detection.detectedPattern,
        unlocked: shouldUnlock,
        analysis: {
          duration: features.duration,
          sampleRate: features.sampleRate,
          channels: features.channels,
          audioSpecs: validation.specs,
          features: {
            spectralCentroid: this.average(features.spectralCentroid),
            avgMfcc: features.mfcc.map((frame) => this.average(frame)),
            avgZcr: this.average(features.zcr),
            avgRms: this.average(features.rms),
          },
          threshold: capsule.confidenceThreshold,
          attemptCount: capsule.unlockAttempts.length,
        },
      }
    } catch (error) {
      this.logger.error(`Audio analysis failed for capsule ${capsule.id}: ${error.message}`)
      throw new BadRequestException(`Audio analysis failed: ${error.message}`)
    }
  }

  /**
   * Get all echo capsules
   */
  async findAll(createdBy?: string): Promise<EchoCapsule[]> {
    const whereCondition = createdBy ? { createdBy } : {}

    return this.capsuleRepository.find({
      where: whereCondition,
      order: { createdAt: "DESC" },
    })
  }

  /**
   * Get a specific echo capsule by ID
   */
  async findOne(id: string): Promise<EchoCapsule> {
    const capsule = await this.capsuleRepository.findOne({
      where: { id },
    })

    if (!capsule) {
      throw new NotFoundException(`Echo capsule with ID ${id} not found`)
    }

    return capsule
  }

  /**
   * Get capsule statistics
   */
  async getStatistics(capsuleId?: string) {
    if (capsuleId) {
      const capsule = await this.findOne(capsuleId)
      const attempts = capsule.unlockAttempts || []

      return {
        capsuleId,
        totalAttempts: attempts.length,
        successfulAttempts: attempts.filter((a) => a.detected).length,
        averageConfidence:
          attempts.length > 0 ? attempts.reduce((sum, a) => sum + a.confidence, 0) / attempts.length : 0,
        unlocked: capsule.unlocked,
        unlockedAt: capsule.unlockedAt,
        soundPattern: capsule.soundPattern,
        confidenceThreshold: capsule.confidenceThreshold,
      }
    }

    // Global statistics
    const allCapsules = await this.capsuleRepository.find()
    const totalAttempts = allCapsules.reduce((sum, c) => sum + (c.unlockAttempts?.length || 0), 0)
    const unlockedCount = allCapsules.filter((c) => c.unlocked).length

    return {
      totalCapsules: allCapsules.length,
      unlockedCapsules: unlockedCount,
      lockedCapsules: allCapsules.length - unlockedCount,
      totalUnlockAttempts: totalAttempts,
      unlockSuccessRate: totalAttempts > 0 ? (unlockedCount / totalAttempts) * 100 : 0,
      soundPatternDistribution: this.getSoundPatternDistribution(allCapsules),
    }
  }

  /**
   * Update capsule confidence threshold
   */
  async updateConfidenceThreshold(capsuleId: string, threshold: number): Promise<EchoCapsule> {
    if (threshold < 0 || threshold > 1) {
      throw new BadRequestException("Confidence threshold must be between 0 and 1")
    }

    const capsule = await this.findOne(capsuleId)
    capsule.confidenceThreshold = threshold

    return this.capsuleRepository.save(capsule)
  }

  private detectAudioFormat(filename?: string): string {
    if (!filename) return "wav"

    const extension = filename.split(".").pop()?.toLowerCase()
    return extension || "wav"
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0
    return arr.reduce((sum, val) => sum + val, 0) / arr.length
  }

  private getSoundPatternDistribution(capsules: EchoCapsule[]) {
    const distribution: Record<string, number> = {}

    capsules.forEach((capsule) => {
      distribution[capsule.soundPattern] = (distribution[capsule.soundPattern] || 0) + 1
    })

    return distribution
  }
}
