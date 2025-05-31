import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import type { VoiceLockCapsuleService } from "./voice-lock-capsule.service"
import type { CreateVoiceLockCapsuleDto } from "./dto/create-voice-lock-capsule.dto"
import type { SubmitVoiceDto } from "./dto/submit-voice.dto"
import { ViewVoiceLockCapsuleDto } from "./dto/view-voice-lock-capsule.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@ApiTags("voice-lock-capsules")
@Controller("capsules/voice-lock")
export class VoiceLockCapsuleController {
  constructor(private readonly voiceLockCapsuleService: VoiceLockCapsuleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new voice lock capsule" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The capsule has been successfully created.",
    type: ViewVoiceLockCapsuleDto,
  })
  async create(
    @Body() createVoiceLockCapsuleDto: CreateVoiceLockCapsuleDto,
    @Request() req,
  ): Promise<ViewVoiceLockCapsuleDto> {
    const capsule = await this.voiceLockCapsuleService.create(createVoiceLockCapsuleDto, req.user.id)
    return {
      id: capsule.id,
      title: capsule.title,
      isLocked: true,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all voice lock capsules for the current user" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all capsules for the user",
    type: [ViewVoiceLockCapsuleDto],
  })
  async findAll(@Request() req) {
    const capsules = await this.voiceLockCapsuleService.findAll(req.user.id)
    return capsules.map(capsule => ({
      id: capsule.id,
      title: capsule.title,
      isLocked: true,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }))
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a voice lock capsule by ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the capsule information (locked by default)",
    type: ViewVoiceLockCapsuleDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  async findOne(@Param('id') id: string, @Request() req) {
    const capsule = await this.voiceLockCapsuleService.findOne(id)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== req.user.id) {
      throw new Error("You don't have permission to access this capsule")
    }

    return {
      id: capsule.id,
      title: capsule.title,
      isLocked: true,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }
  }

  @Post(":id/unlock")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Submit voice sample and try to unlock a capsule" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the capsule with content if voice verification is successful",
    type: ViewVoiceLockCapsuleDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  unlockCapsule(@Param('id') id: string, @Body() submitVoiceDto: SubmitVoiceDto, @Request() req) {
    return this.voiceLockCapsuleService.unlockCapsule(id, submitVoiceDto, req.user.id)
  }

  @Get(":id/attempts")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get unlock attempt history for a capsule" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the unlock attempt history",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  getUnlockAttempts(@Param('id') id: string, @Request() req) {
    return this.voiceLockCapsuleService.getUnlockAttempts(id, req.user.id)
  }
}
