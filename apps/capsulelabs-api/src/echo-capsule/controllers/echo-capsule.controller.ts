import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Patch,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes, ApiBody } from "@nestjs/swagger"
import type { EchoCapsuleService } from "../services/echo-capsule.service"
import type { CreateEchoCapsuleDto } from "../dto/create-echo-capsule.dto"
import type { SubmitAudioDto } from "../dto/submit-audio.dto"
import type { Express } from "express"

@ApiTags("Echo Capsule")
@Controller("echo-capsule")
export class EchoCapsuleController {
  constructor(private readonly echoCapsuleService: EchoCapsuleService) {}

  @Post('create')
  @ApiOperation({ 
    summary: 'Create a new echo capsule',
    description: 'Creates a capsule that unlocks when a specific sound pattern is detected'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Echo capsule created successfully'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data'
  })
  async create(@Body() createDto: CreateEchoCapsuleDto) {
    return this.echoCapsuleService.create(createDto);
  }

  @Post("submit")
  @UseInterceptors(FileInterceptor("audio"))
  @ApiOperation({
    summary: "Submit audio for capsule unlock",
    description: "Analyzes submitted audio to detect target sound pattern and potentially unlock capsule",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Audio file and capsule information",
    schema: {
      type: "object",
      properties: {
        audio: {
          type: "string",
          format: "binary",
          description: "Audio file (WAV, MP3, M4A, OGG, WebM)",
        },
        capsuleId: {
          type: "string",
          format: "uuid",
          description: "ID of the echo capsule",
        },
        audioFormat: {
          type: "string",
          enum: ["wav", "mp3", "m4a", "ogg", "webm"],
          description: "Audio format (optional, auto-detected from filename)",
        },
        metadata: {
          type: "string",
          description: "Additional metadata about the audio submission",
        },
      },
      required: ["audio", "capsuleId"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "Audio analysis completed",
    schema: {
      type: "object",
      properties: {
        detected: { type: "boolean" },
        confidence: { type: "number" },
        detectedPattern: { type: "string", nullable: true },
        unlocked: { type: "boolean" },
        analysis: { type: "object" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid audio file or analysis failed",
  })
  @ApiResponse({
    status: 404,
    description: "Echo capsule not found",
  })
  async submitAudio(@UploadedFile() audioFile: Express.Multer.File, @Body() submitDto: SubmitAudioDto) {
    if (!audioFile) {
      throw new BadRequestException("Audio file is required")
    }

    return this.echoCapsuleService.submitAudio(submitDto, audioFile.buffer, audioFile.originalname)
  }

  @Get('capsules')
  @ApiOperation({ 
    summary: 'Get all echo capsules',
    description: 'Retrieves all echo capsules, optionally filtered by creator'
  })
  @ApiQuery({ 
    name: 'createdBy', 
    required: false, 
    description: 'Filter by capsule creator'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of echo capsules'
  })
  async findAll(@Query('createdBy') createdBy?: string) {
    return this.echoCapsuleService.findAll(createdBy);
  }

  @Get('capsules/:id')
  @ApiOperation({ 
    summary: 'Get a specific echo capsule',
    description: 'Retrieves a single echo capsule by its ID'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Echo capsule found'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Echo capsule not found'
  })
  async findOne(@Param('id') id: string) {
    return this.echoCapsuleService.findOne(id);
  }

  @Get('statistics')
  @ApiOperation({ 
    summary: 'Get echo capsule statistics',
    description: 'Retrieves statistics about all capsules or a specific capsule'
  })
  @ApiQuery({ 
    name: 'capsuleId', 
    required: false, 
    description: 'Get statistics for specific capsule'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistics retrieved successfully'
  })
  async getStatistics(@Query('capsuleId') capsuleId?: string) {
    return this.echoCapsuleService.getStatistics(capsuleId);
  }

  @Patch("capsules/:id/threshold")
  @ApiOperation({
    summary: "Update confidence threshold",
    description: "Updates the confidence threshold for sound detection",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "New confidence threshold (0.0 - 1.0)",
        },
      },
      required: ["threshold"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "Confidence threshold updated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid threshold value",
  })
  @ApiResponse({
    status: 404,
    description: "Echo capsule not found",
  })
  async updateConfidenceThreshold(@Param('id') id: string, @Body('threshold') threshold: number) {
    return this.echoCapsuleService.updateConfidenceThreshold(id, threshold)
  }
}
