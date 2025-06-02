import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { ArchiveCapsule } from "./entities/archive-capsule.entity"
import type { MediaEngagementService } from "./services/media-engagement.service"
import type { CreateArchiveCapsuleDto } from "./dto/create-archive-capsule.dto"
import type { MediaEventDto } from "./dto/media-event.dto"
import type { StartSessionDto } from "./dto/start-session.dto"
import type { ViewArchiveCapsuleDto } from "./dto/view-archive-capsule.dto"

@Injectable()
export class ArchiveCapsuleService {
  constructor(
    private readonly archiveCapsuleRepository: Repository<ArchiveCapsule>,
    private readonly mediaEngagementService: MediaEngagementService,
  ) {}

  async create(createArchiveCapsuleDto: CreateArchiveCapsuleDto, userId: string): Promise<ArchiveCapsule> {
    // Validate that minimum engagement doesn't exceed media duration
    if (createArchiveCapsuleDto.minimumEngagementSeconds > createArchiveCapsuleDto.mediaDurationSeconds) {
      throw new Error("Minimum engagement time cannot exceed media duration")
    }

    // Validate completion percentage requirements
    const minEngagementPercentage =
      createArchiveCapsuleDto.minimumEngagementSeconds / createArchiveCapsuleDto.mediaDurationSeconds
    if (minEngagementPercentage > (createArchiveCapsuleDto.minimumCompletionPercentage || 0.8)) {
      throw new Error("Minimum engagement time is inconsistent with completion percentage requirement")
    }

    const capsule = this.archiveCapsuleRepository.create({
      ...createArchiveCapsuleDto,
      userId,
      unlocked: false,
      totalEngagementSeconds: 0,
      completionPercentage: 0,
    })

    return this.archiveCapsuleRepository.save(capsule)
  }

  async findOne(id: string): Promise<ArchiveCapsule> {
    const capsule = await this.archiveCapsuleRepository.findOne({ where: { id } })

    if (!capsule) {
      throw new NotFoundException(`Archive capsule with ID ${id} not found`)
    }

    return capsule
  }

  async findAll(userId: string): Promise<ArchiveCapsule[]> {
    return this.archiveCapsuleRepository.find({
      where: { userId },
    })
  }

  async startMediaSession(
    id: string,
    startSessionDto: StartSessionDto,
    userId: string,
  ): Promise<{ sessionId: string }> {
    const capsule = await this.findOne(id)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule")
    }

    const session = await this.mediaEngagementService.startSession(
      capsule.id,
      userId,
      startSessionDto.userAgent,
      startSessionDto.ipAddress,
    )

    return { sessionId: session.id }
  }

  async trackMediaEvent(id: string, mediaEventDto: MediaEventDto, userId: string): Promise<ViewArchiveCapsuleDto> {
    const capsule = await this.findOne(id)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule")
    }

    // Track the media event
    await this.mediaEngagementService.trackMediaEvent(capsule.id, userId, mediaEventDto, capsule)

    // Analyze current engagement
    const analysis = await this.mediaEngagementService.analyzeEngagement(capsule.id, userId)

    // Update capsule with latest stats
    capsule.totalEngagementSeconds = analysis.totalPlayTime
    capsule.completionPercentage = analysis.completionPercentage

    // Check if capsule should be unlocked
    if (analysis.requirementsMet && analysis.isValidEngagement && !capsule.unlocked) {
      capsule.unlocked = true
      capsule.unlockedAt = new Date()
    }

    await this.archiveCapsuleRepository.save(capsule)

    return this.buildViewDto(capsule, analysis)
  }

  async getCapsuleStatus(id: string, userId: string): Promise<ViewArchiveCapsuleDto> {
    const capsule = await this.findOne(id)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule")
    }

    // Get current engagement analysis
    const analysis = await this.mediaEngagementService.analyzeEngagement(capsule.id, userId)

    return this.buildViewDto(capsule, analysis)
  }

  private buildViewDto(capsule: ArchiveCapsule, analysis: any): ViewArchiveCapsuleDto {
    const remainingSeconds = Math.max(0, capsule.minimumEngagementSeconds - analysis.totalPlayTime)
    const remainingPercentage = Math.max(0, capsule.minimumCompletionPercentage - analysis.completionPercentage)

    const response: ViewArchiveCapsuleDto = {
      id: capsule.id,
      title: capsule.title,
      unlocked: capsule.unlocked,
      mediaUrl: capsule.mediaUrl,
      mediaTitle: capsule.mediaTitle,
      requirements: {
        mediaType: capsule.mediaType,
        mediaDurationSeconds: capsule.mediaDurationSeconds,
        minimumEngagementSeconds: capsule.minimumEngagementSeconds,
        minimumCompletionPercentage: capsule.minimumCompletionPercentage,
        requireFullCompletion: capsule.requireFullCompletion,
        allowPausing: capsule.allowPausing,
        maxPauseTimeSeconds: capsule.maxPauseTimeSeconds,
      },
      progress: {
        totalEngagementSeconds: analysis.totalPlayTime,
        completionPercentage: analysis.completionPercentage,
        requirementsMet: analysis.requirementsMet && analysis.isValidEngagement,
        remainingSeconds,
        remainingPercentage,
      },
      unlockedAt: capsule.unlockedAt,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }

    // Only include content if unlocked
    if (capsule.unlocked) {
      response.content = capsule.content
    }

    return response
  }

  async getEngagementHistory(capsuleId: string, userId: string): Promise<any[]> {
    const capsule = await this.findOne(capsuleId)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule's history")
    }

    return this.mediaEngagementService.getSessionHistory(capsuleId, userId)
  }

  async endMediaSession(id: string, sessionId: string, userId: string): Promise<void> {
    const capsule = await this.findOne(id)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule")
    }

    await this.mediaEngagementService.endSession(sessionId, userId)
  }
}
