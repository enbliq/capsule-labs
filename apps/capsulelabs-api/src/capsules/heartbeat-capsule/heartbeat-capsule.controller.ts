import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import type { HeartbeatCapsuleService } from "./heartbeat-capsule.service"
import type { CreateHeartbeatCapsuleDto } from "./dto/create-heartbeat-capsule.dto"
import type { SubmitBpmDto } from "./dto/submit-bpm.dto"
import { ViewHeartbeatCapsuleDto } from "./dto/view-heartbeat-capsule.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@ApiTags("heartbeat-capsules")
@Controller("capsules/heartbeat")
export class HeartbeatCapsuleController {
  constructor(private readonly heartbeatCapsuleService: HeartbeatCapsuleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new heartbeat capsule" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The capsule has been successfully created.",
    type: ViewHeartbeatCapsuleDto,
  })
  async create(@Body() createHeartbeatCapsuleDto: CreateHeartbeatCapsuleDto, @Request() req: any) {
    const capsule = await this.heartbeatCapsuleService.create(createHeartbeatCapsuleDto, req.user.id)
    return {
      id: capsule.id,
      title: capsule.title,
      isLocked: true,
      targetMinBpm: capsule.targetMinBpm,
      targetMaxBpm: capsule.targetMaxBpm,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all heartbeat capsules for the current user" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all capsules for the user",
    type: [ViewHeartbeatCapsuleDto],
  })
  async findAll(@Request() req) {
    const capsules = await this.heartbeatCapsuleService.findAll(req.user.id)
    return capsules.map(capsule => ({
      id: capsule.id,
      title: capsule.title,
      isLocked: true,
      targetMinBpm: capsule.targetMinBpm,
      targetMaxBpm: capsule.targetMaxBpm,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }))
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a heartbeat capsule by ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the capsule information (locked by default)",
    type: ViewHeartbeatCapsuleDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  async findOne(@Param('id') id: string, @Request() req) {
    const capsule = await this.heartbeatCapsuleService.findOne(id)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== req.user.id) {
      throw new Error("You don't have permission to access this capsule")
    }

    return {
      id: capsule.id,
      title: capsule.title,
      isLocked: true,
      targetMinBpm: capsule.targetMinBpm,
      targetMaxBpm: capsule.targetMaxBpm,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }
  }

  @Post(":id/unlock")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Submit BPM and try to unlock a capsule" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the capsule with content if BPM is within range",
    type: ViewHeartbeatCapsuleDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  unlockCapsule(@Param('id') id: string, @Body() submitBpmDto: SubmitBpmDto, @Request() req) {
    return this.heartbeatCapsuleService.unlockCapsule(id, submitBpmDto, req.user.id)
  }

  @Get(":id/history")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get BPM submission history for a capsule" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the BPM submission history",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  getSubmissionHistory(@Param('id') id: string, @Request() req) {
    return this.heartbeatCapsuleService.getSubmissionHistory(id, req.user.id)
  }
}
