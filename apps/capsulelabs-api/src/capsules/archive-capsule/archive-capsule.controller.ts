import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import type { ArchiveCapsuleService } from "./archive-capsule.service"
import type { CreateArchiveCapsuleDto } from "./dto/create-archive-capsule.dto"
import type { MediaEventDto } from "./dto/media-event.dto"
import type { StartSessionDto } from "./dto/start-session.dto"
import { ViewArchiveCapsuleDto } from "./dto/view-archive-capsule.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@ApiTags("archive-capsules")
@Controller("capsules/archive")
export class ArchiveCapsuleController {
  constructor(private readonly archiveCapsuleService: ArchiveCapsuleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new archive capsule with media engagement requirements" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The capsule has been successfully created.",
    type: ViewArchiveCapsuleDto,
  })
  async create(createArchiveCapsuleDto: CreateArchiveCapsuleDto, @Request() req): Promise<ViewArchiveCapsuleDto> {
    const capsule = await this.archiveCapsuleService.create(createArchiveCapsuleDto, req.user.id)

    return {
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
        totalEngagementSeconds: 0,
        completionPercentage: 0,
        requirementsMet: false,
        remainingSeconds: capsule.minimumEngagementSeconds,
        remainingPercentage: capsule.minimumCompletionPercentage,
      },
      unlockedAt: capsule.unlockedAt,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all archive capsules for the current user" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all capsules for the user",
    type: [ViewArchiveCapsuleDto],
  })
  async findAll(@Request() req) {
    const capsules = await this.archiveCapsuleService.findAll(req.user.id)
    
    // Return basic info without detailed progress (would need individual status calls)
    return capsules.map(capsule => ({
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
        totalEngagementSeconds: capsule.totalEngagementSeconds,
        completionPercentage: capsule.completionPercentage,
        requirementsMet: capsule.unlocked,
        remainingSeconds: Math.max(0, capsule.minimumEngagementSeconds - capsule.totalEngagementSeconds),
        remainingPercentage: Math.max(0, capsule.minimumCompletionPercentage - capsule.completionPercentage),
      },
      unlockedAt: capsule.unlockedAt,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }))
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get archive capsule status with current progress" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the capsule with current engagement progress",
    type: ViewArchiveCapsuleDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  getCapsuleStatus(@Param('id') id: string, @Request() req) {
    return this.archiveCapsuleService.getCapsuleStatus(id, req.user.id)
  }

  @Post(":id/session/start")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Start a new media engagement session" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the session ID for tracking media events",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  startSession(@Param('id') id: string, @Body() startSessionDto: StartSessionDto, @Request() req) {
    return this.archiveCapsuleService.startMediaSession(id, startSessionDto, req.user.id)
  }

  @Post(":id/session/:sessionId/end")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "End a media engagement session" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Session ended successfully",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  async endSession(@Param('id') id: string, @Param('sessionId') sessionId: string, @Request() req) {
    await this.archiveCapsuleService.endMediaSession(id, sessionId, req.user.id)
    return { message: "Session ended successfully" }
  }

  @Post(":id/track")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Track a media engagement event" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns updated capsule status after tracking the event",
    type: ViewArchiveCapsuleDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  trackEvent(@Param('id') id: string, @Body() mediaEventDto: MediaEventDto, @Request() req) {
    return this.archiveCapsuleService.trackMediaEvent(id, mediaEventDto, req.user.id)
  }

  @Get(":id/history")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get media engagement history for a capsule" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the engagement session history",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  getEngagementHistory(@Param('id') id: string, @Request() req) {
    return this.archiveCapsuleService.getEngagementHistory(id, req.user.id)
  }
}
