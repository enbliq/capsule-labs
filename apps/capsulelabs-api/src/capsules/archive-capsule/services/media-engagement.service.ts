import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type MediaEngagement, MediaEventType } from "../entities/media-engagement.entity"
import type { MediaSession } from "../entities/media-session.entity"
import type { ArchiveCapsule } from "../entities/archive-capsule.entity"
import type { MediaEventDto } from "../dto/media-event.dto"

interface EngagementAnalysis {
  totalPlayTime: number
  totalPauseTime: number
  completionPercentage: number
  requirementsMet: boolean
  maxPositionReached: number
  isValidEngagement: boolean
}

@Injectable()
export class MediaEngagementService {
  private readonly logger = new Logger(MediaEngagementService.name)

  constructor(
    private readonly mediaEngagementRepository: Repository<MediaEngagement>,
    private readonly mediaSessionRepository: Repository<MediaSession>,
  ) {}

  async startSession(capsuleId: string, userId: string, userAgent?: string, ipAddress?: string): Promise<MediaSession> {
    // End any existing active sessions for this user and capsule
    await this.mediaSessionRepository.update({ capsuleId, userId, active: true }, { active: false })

    const session = this.mediaSessionRepository.create({
      capsuleId,
      userId,
      userAgent,
      ipAddress,
      active: true,
    })

    return this.mediaSessionRepository.save(session)
  }

  async trackMediaEvent(
    capsuleId: string,
    userId: string,
    mediaEventDto: MediaEventDto,
    capsule: ArchiveCapsule,
  ): Promise<MediaEngagement> {
    // Verify session exists and is active
    const session = await this.mediaSessionRepository.findOne({
      where: { id: mediaEventDto.sessionId, capsuleId, userId, active: true },
    })

    if (!session) {
      throw new Error("Invalid or inactive session")
    }

    // Create the engagement record
    const engagement = this.mediaEngagementRepository.create({
      userId,
      capsuleId,
      sessionId: mediaEventDto.sessionId,
      eventType: mediaEventDto.eventType,
      currentTime: mediaEventDto.currentTime,
      previousTime: mediaEventDto.previousTime,
      duration: mediaEventDto.duration,
      playbackRate: mediaEventDto.playbackRate || 1.0,
      volume: mediaEventDto.volume,
      metadata: mediaEventDto.metadata,
    })

    const savedEngagement = await this.mediaEngagementRepository.save(engagement)

    // Update session statistics
    await this.updateSessionStats(session, mediaEventDto, capsule)

    this.logger.log(
      `Media event tracked: ${mediaEventDto.eventType} at ${mediaEventDto.currentTime}s for capsule ${capsuleId}`,
    )

    return savedEngagement
  }

  async analyzeEngagement(capsuleId: string, userId: string): Promise<EngagementAnalysis> {
    // Get all sessions for this user and capsule
    const sessions = await this.mediaSessionRepository.find({
      where: { capsuleId, userId },
      relations: ["engagements"],
      order: { createdAt: "DESC" },
    })

    if (sessions.length === 0) {
      return {
        totalPlayTime: 0,
        totalPauseTime: 0,
        completionPercentage: 0,
        requirementsMet: false,
        maxPositionReached: 0,
        isValidEngagement: false,
      }
    }

    // Calculate total engagement across all sessions
    let totalPlayTime = 0
    let totalPauseTime = 0
    let maxPositionReached = 0

    for (const session of sessions) {
      totalPlayTime += session.totalPlayTimeSeconds
      totalPauseTime += session.totalPauseTimeSeconds
      maxPositionReached = Math.max(maxPositionReached, session.maxPositionReached)
    }

    // Get the capsule to check requirements
    const capsule = await this.getCapsule(capsuleId)
    const completionPercentage = maxPositionReached / capsule.mediaDurationSeconds

    // Check if requirements are met
    const requirementsMet = this.checkRequirements(totalPlayTime, totalPauseTime, completionPercentage, capsule)

    // Validate engagement (anti-gaming measures)
    const isValidEngagement = this.validateEngagement(sessions, capsule)

    return {
      totalPlayTime,
      totalPauseTime,
      completionPercentage,
      requirementsMet,
      maxPositionReached,
      isValidEngagement,
    }
  }

  private async updateSessionStats(
    session: MediaSession,
    event: MediaEventDto,
    capsule: ArchiveCapsule,
  ): Promise<void> {
    // Update max position reached
    session.maxPositionReached = Math.max(session.maxPositionReached, event.currentTime)

    // Calculate completion percentage
    session.completionPercentage = session.maxPositionReached / capsule.mediaDurationSeconds

    // Mark as completed if reached the end
    if (event.eventType === MediaEventType.COMPLETE || session.completionPercentage >= 0.99) {
      session.completed = true
    }

    // Calculate play/pause time based on event type and timing
    await this.calculatePlayPauseTime(session, event)

    await this.mediaSessionRepository.save(session)
  }

  private async calculatePlayPauseTime(session: MediaSession, event: MediaEventDto): Promise<void> {
    // Get the last engagement event for this session
    const lastEvent = await this.mediaEngagementRepository.findOne({
      where: { sessionId: session.id },
      order: { createdAt: "DESC" },
      skip: 1, // Skip the current event we just saved
    })

    if (!lastEvent) {
      return // First event, nothing to calculate
    }

    const timeDiff = (new Date().getTime() - lastEvent.createdAt.getTime()) / 1000

    // Only count reasonable time differences (prevent gaming)
    if (timeDiff > 0 && timeDiff < 300) {
      // Max 5 minutes between events
      if (lastEvent.eventType === MediaEventType.PLAY) {
        // Was playing, so add to play time
        session.totalPlayTimeSeconds += Math.min(timeDiff, event.currentTime - lastEvent.currentTime)
      } else if (lastEvent.eventType === MediaEventType.PAUSE) {
        // Was paused, so add to pause time
        session.totalPauseTimeSeconds += timeDiff
      }
    }
  }

  private checkRequirements(
    totalPlayTime: number,
    totalPauseTime: number,
    completionPercentage: number,
    capsule: ArchiveCapsule,
  ): boolean {
    // Check minimum engagement time
    if (totalPlayTime < capsule.minimumEngagementSeconds) {
      return false
    }

    // Check completion percentage
    if (completionPercentage < capsule.minimumCompletionPercentage) {
      return false
    }

    // Check full completion if required
    if (capsule.requireFullCompletion && completionPercentage < 0.95) {
      return false
    }

    // Check pause time limits
    if (!capsule.allowPausing && totalPauseTime > 0) {
      return false
    }

    if (capsule.allowPausing && totalPauseTime > capsule.maxPauseTimeSeconds) {
      return false
    }

    return true
  }

  private validateEngagement(sessions: MediaSession[], capsule: ArchiveCapsule): boolean {
    // Anti-gaming measures
    for (const session of sessions) {
      // Check for suspicious rapid play/pause patterns
      if (session.engagements && session.engagements.length > 0) {
        const playPauseRatio = session.totalPlayTimeSeconds / (session.totalPauseTimeSeconds + 1)

        // If too many pauses relative to play time, might be gaming
        if (playPauseRatio < 0.1 && session.totalPauseTimeSeconds > 60) {
          return false
        }

        // Check for excessive seeking
        const seekEvents = session.engagements.filter((e) => e.eventType === MediaEventType.SEEK)
        if (seekEvents.length > capsule.mediaDurationSeconds / 10) {
          // More than 1 seek per 10 seconds
          return false
        }
      }
    }

    return true
  }

  private async getCapsule(capsuleId: string): Promise<ArchiveCapsule> {
    // This would typically be injected, but for simplicity we'll assume it's available
    // In a real implementation, you'd inject the ArchiveCapsuleService or Repository
    throw new Error("getCapsule method needs to be implemented with proper capsule repository injection")
  }

  async getSessionHistory(capsuleId: string, userId: string): Promise<MediaSession[]> {
    return this.mediaSessionRepository.find({
      where: { capsuleId, userId },
      relations: ["engagements"],
      order: { createdAt: "DESC" },
    })
  }

  async endSession(sessionId: string, userId: string): Promise<void> {
    await this.mediaSessionRepository.update({ id: sessionId, userId }, { active: false })
  }
}
