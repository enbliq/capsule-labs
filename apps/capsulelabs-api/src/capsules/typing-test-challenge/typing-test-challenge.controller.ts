import { Controller, Post, Get, Param, HttpCode, HttpStatus, ValidationPipe, UsePipes } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger"
import type { TypingTestChallengeService } from "./typing-test-challenge.service"
import {
  type CreateTypingTestDto,
  type StartTypingTestDto,
  type SubmitTypingTestDto,
  TypingTestSessionDto,
  TypingTestResultDto,
  TypingTestStatisticsDto,
} from "./dto/typing-test-challenge.dto"

@ApiTags("typing-test-challenge")
@Controller("typing-test-challenge")
@UsePipes(new ValidationPipe({ transform: true }))
export class TypingTestChallengeController {
  constructor(private readonly typingTestService: TypingTestChallengeService) {}

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new typing test session" })
  @ApiResponse({
    status: 201,
    description: "Typing test session created successfully",
    type: TypingTestSessionDto,
  })
  async createTypingTest(createDto: CreateTypingTestDto): Promise<TypingTestSessionDto> {
    return this.typingTestService.createTypingTest(createDto)
  }

  @Post(":sessionId/start")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Start a typing test session" })
  @ApiParam({ name: "sessionId", description: "Typing test session ID" })
  @ApiResponse({
    status: 200,
    description: "Typing test started successfully",
  })
  async startTypingTest(
    @Param('sessionId') sessionId: string,
    startDto: StartTypingTestDto,
  ): Promise<{ success: boolean; startTime: Date }> {
    return this.typingTestService.startTypingTest(sessionId, startDto)
  }

  @Post(":sessionId/submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Submit typing test results" })
  @ApiParam({ name: "sessionId", description: "Typing test session ID" })
  @ApiResponse({
    status: 200,
    description: "Typing test submitted successfully",
    type: TypingTestResultDto,
  })
  async submitTypingTest(
    @Param('sessionId') sessionId: string,
    submitDto: SubmitTypingTestDto,
  ): Promise<TypingTestResultDto> {
    return this.typingTestService.submitTypingTest(sessionId, submitDto)
  }

  @Get(':sessionId/status')
  @ApiOperation({ summary: 'Get typing test session status' })
  @ApiParam({ name: 'sessionId', description: 'Typing test session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session status retrieved successfully',
    type: TypingTestSessionDto,
  })
  async getSessionStatus(@Param('sessionId') sessionId: string): Promise<TypingTestSessionDto> {
    return this.typingTestService.getSessionStatus(sessionId);
  }

  @Get('user/:userId/sessions')
  @ApiOperation({ summary: 'Get user typing test sessions' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User sessions retrieved successfully',
    type: [TypingTestResultDto],
  })
  async getUserSessions(@Param('userId') userId: string): Promise<TypingTestResultDto[]> {
    return this.typingTestService.getUserSessions(userId);
  }

  @Get('user/:userId/statistics')
  @ApiOperation({ summary: 'Get user typing test statistics' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    type: TypingTestStatisticsDto,
  })
  async getUserStatistics(@Param('userId') userId: string): Promise<TypingTestStatisticsDto> {
    return this.typingTestService.getUserStatistics(userId);
  }
}
