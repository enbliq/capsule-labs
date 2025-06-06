import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger"
import type { EmotionCapsuleService } from "./emotion-capsule.service"
import type { CreateEmotionCapsuleDto } from "./dto/create-emotion-capsule.dto"
import type { SubmitEmotionDto } from "./dto/submit-emotion.dto"
import { EmotionCapsuleResponseDto } from "./dto/emotion-capsule-response.dto"
import { UnlockResultDto } from "./dto/unlock-result.dto"
import { EmotionType } from "./enums/emotion-type.enum"

@ApiTags("emotion-capsules")
@Controller("capsules/emotion")
export class EmotionCapsuleController {
  constructor(private readonly emotionCapsuleService: EmotionCapsuleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new emotion capsule" })
  @ApiResponse({
    status: 201,
    description: "Emotion capsule created successfully",
    type: EmotionCapsuleResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  async create(
    @Body()
 createEmotionCapsuleDto: CreateEmotionCapsuleDto,
  ): Promise<EmotionCapsuleResponseDto> {
    return this.emotionCapsuleService.create(createEmotionCapsuleDto)
  }

  @Get()
  @ApiOperation({ summary: "Get all emotion capsules" })
  @ApiQuery({ name: "userId", required: false, description: "Filter by user ID" })
  @ApiResponse({
    status: 200,
    description: "Emotion capsules retrieved successfully",
    type: [EmotionCapsuleResponseDto],
  })
  async findAll(
    @Query("userId") userId?: string,
  ): Promise<EmotionCapsuleResponseDto[]> {
    if (userId) {
      return this.emotionCapsuleService.findByUser(userId)
    }
    return this.emotionCapsuleService.findAll()
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an emotion capsule by ID" })
  @ApiParam({ name: "id", description: "Emotion capsule UUID" })
  @ApiResponse({
    status: 200,
    description: "Emotion capsule retrieved successfully",
    type: EmotionCapsuleResponseDto,
  })
  @ApiResponse({ status: 404, description: "Emotion capsule not found" })
  async findOne(@Param("id") id: string): Promise<EmotionCapsuleResponseDto> {
    return this.emotionCapsuleService.findOne(id)
  }

  @Post(":id/unlock")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Attempt to unlock an emotion capsule",
    description: `Submit detected emotion to unlock a capsule. 
    Supported emotions: ${Object.values(EmotionType).join(", ")}.
    Confidence should be a value between 0 and 1, where 1 is 100% confidence.`,
  })
  @ApiParam({ name: "id", description: "Emotion capsule UUID" })
  @ApiResponse({
    status: 200,
    description: "Unlock attempt processed",
    type: UnlockResultDto,
  })
  @ApiResponse({ status: 404, description: "Emotion capsule not found" })
  async unlock(@Param("id") id: string, @Body() submitEmotionDto: SubmitEmotionDto): Promise<UnlockResultDto> {
    return this.emotionCapsuleService.attemptUnlock(id, submitEmotionDto)
  }
}
