import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import type { TruthCapsuleService } from "./truth-capsule.service"
import type { CreateTruthCapsuleDto } from "./dto/create-truth-capsule.dto"
import type { SubmitAnswersDto } from "./dto/submit-answers.dto"
import { ViewTruthCapsuleDto } from "./dto/view-truth-capsule.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@ApiTags("truth-capsules")
@Controller("capsules/truth")
export class TruthCapsuleController {
  constructor(private readonly truthCapsuleService: TruthCapsuleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new truth capsule" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The capsule has been successfully created.",
    type: ViewTruthCapsuleDto,
  })
  async create(createTruthCapsuleDto: CreateTruthCapsuleDto, @Request() req): Promise<ViewTruthCapsuleDto> {
    const capsule = await this.truthCapsuleService.create(createTruthCapsuleDto, req.user.id)
    return {
      id: capsule.id,
      title: capsule.title,
      isLocked: true,
      truthThreshold: capsule.truthThreshold,
      maxAttempts: capsule.maxAttempts,
      attemptCount: capsule.attemptCount,
      questions: capsule.questions?.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        type: q.type,
        orderIndex: q.orderIndex,
        weight: q.weight,
      })),
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all truth capsules for the current user" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all capsules for the user",
    type: [ViewTruthCapsuleDto],
  })
  async findAll(@Request() req) {
    const capsules = await this.truthCapsuleService.findAll(req.user.id)
    return capsules.map(capsule => ({
      id: capsule.id,
      title: capsule.title,
      isLocked: true,
      truthThreshold: capsule.truthThreshold,
      maxAttempts: capsule.maxAttempts,
      attemptCount: capsule.attemptCount,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }))
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a truth capsule by ID with questions" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the capsule with questions for answering",
    type: ViewTruthCapsuleDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  getQuestions(@Param('id') id: string, @Request() req) {
    return this.truthCapsuleService.getQuestionsForCapsule(id, req.user.id)
  }

  @Post(":id/submit")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Submit answers and try to unlock a capsule" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the capsule with content if truth verification is successful",
    type: ViewTruthCapsuleDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  submitAnswers(@Param('id') id: string, @Body() submitAnswersDto: SubmitAnswersDto, @Request() req) {
    return this.truthCapsuleService.submitAnswers(id, submitAnswersDto, req.user.id)
  }

  @Get(":id/history")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get answer history for a capsule" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the answer history",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  getAnswerHistory(@Param('id') id: string, @Request() req) {
    return this.truthCapsuleService.getAnswerHistory(id, req.user.id)
  }

  @Get("questions/suggestions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get suggested questions for creating a truth capsule" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns suggested questions",
  })
  getSuggestedQuestions(@Request() req) {
    return this.truthCapsuleService.generateSuggestedQuestions(req.user.id)
  }
}
