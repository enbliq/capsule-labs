import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger"
import type { WhisperPasswordChallengeService } from "./whisper-password-challenge.service"
import { RateLimitGuard } from "../rate-limit/guards/rate-limit.guard"
import { RateLimit } from "../rate-limit/decorators/rate-limit.decorator"
import {
  type CreateWhisperSessionDto,
  type ProcessWhisperAttemptDto,
  WhisperSessionResponseDto,
  WhisperAttemptResponseDto,
  WhisperSessionSummaryDto,
  WhisperUserStatisticsDto,
} from "./dto/whisper-password-challenge.dto"

@ApiTags("Whisper Password Challenge")
@Controller("whisper-password-challenge")
@UseGuards(RateLimitGuard)
export class WhisperPasswordChallengeController {
  constructor(private readonly whisperService: WhisperPasswordChallengeService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ limit: 10, windowMs: 60000 }) // 10 sessions per minute
  @ApiOperation({ summary: 'Create a new whisper password challenge session' })
  @ApiResponse({ status: 201, description: 'Session created successfully', type: WhisperSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async createSession(@Body() createDto: CreateWhisperSessionDto): Promise<WhisperSessionResponseDto> {
    try {
      const session = await this.whisperService.createSession(
        createDto.userId,
        createDto.password,
        {
          passwordHint: createDto.passwordHint,
          maxDecibelLevel: createDto.maxDecibelLevel,
          minDecibelLevel: createDto.minDecibelLevel,
          minConfidence: createDto.minConfidence,
          maxAttempts: createDto.maxAttempts,
          sessionExpiry: createDto.sessionExpiry,
          maxDuration: createDto.maxDuration,
          minDuration: createDto.minDuration,
          allowedLanguages: createDto.allowedLanguages,
          requireExactMatch: createDto.requireExactMatch,
          caseSensitive: createDto.caseSensitive,
          allowPartialMatch: createDto.allowPartialMatch,
          partialMatchThreshold: createDto.partialMatchThreshold,
        },
      );

      return {
        sessionId: session.sessionId,
        userId: session.userId,
        passwordHint: session.passwordHint,
        status: session.status,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        maxAttempts: session.maxAttempts,
        remainingAttempts: session.remainingAttempts,
        settings: session.settings,
        unlocked: session.unlocked,
        message: 'Whisper password challenge session created successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post(":sessionId/attempt")
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 20, windowMs: 60000 }) // 20 attempts per minute
  @ApiOperation({ summary: "Process a whisper password attempt" })
  @ApiParam({ name: "sessionId", description: "Session ID" })
  @ApiResponse({ status: 200, description: "Attempt processed", type: WhisperAttemptResponseDto })
  @ApiResponse({ status: 400, description: "Invalid attempt data" })
  @ApiResponse({ status: 404, description: "Session not found" })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async processAttempt(
    @Param('sessionId') sessionId: string,
    @Body() attemptDto: ProcessWhisperAttemptDto,
  ): Promise<WhisperAttemptResponseDto> {
    try {
      const result = await this.whisperService.processWhisperAttempt(
        sessionId,
        attemptDto.audioAnalysis,
        attemptDto.speechResult,
      )

      return {
        success: result.success,
        unlocked: result.unlocked,
        message: result.message,
        attempt: {
          attemptId: result.attempt.attemptId,
          timestamp: result.attempt.timestamp,
          passwordMatch: result.attempt.passwordMatch,
          volumeValid: result.attempt.volumeValid,
          success: result.attempt.success,
          failureReason: result.attempt.failureReason,
          audioAnalysis: result.attempt.audioAnalysis,
          speechResult: result.attempt.speechResult,
        },
        session: {
          sessionId: result.session.sessionId,
          status: result.session.status,
          remainingAttempts: result.session.remainingAttempts,
          unlocked: result.session.unlocked,
          statistics: result.session.statistics,
        },
      }
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }

  @Get(':sessionId/status')
  @ApiOperation({ summary: 'Get whisper session status' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session status retrieved', type: WhisperSessionResponseDto })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionStatus(@Param('sessionId') sessionId: string): Promise<WhisperSessionResponseDto> {
    const session = await this.whisperService.getSession(sessionId);
    if (!session) {
      throw new BadRequestException('Session not found');
    }

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      passwordHint: session.passwordHint,
      status: session.status,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      maxAttempts: session.maxAttempts,
      remainingAttempts: session.remainingAttempts,
      settings: session.settings,
      unlocked: session.unlocked,
      completedAt: session.completedAt,
      attempts: session.attempts.map(attempt => ({
        attemptId: attempt.attemptId,
        timestamp: attempt.timestamp,
        passwordMatch: attempt.passwordMatch,
        volumeValid: attempt.volumeValid,
        success: attempt.success,
        failureReason: attempt.failureReason,
      })),
      statistics: session.statistics,
      message: `Session is ${session.status}`,
    };
  }

  @Post(':sessionId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End whisper session manually' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session ended successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async endSession(@Param('sessionId') sessionId: string): Promise<{ message: string }> {
    await this.whisperService.endSession(sessionId);
    return { message: 'Session ended successfully' };
  }

  @Get('user/:userId/sessions')
  @ApiOperation({ summary: 'Get user whisper sessions' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User sessions retrieved', type: [WhisperSessionSummaryDto] })
  async getUserSessions(@Param('userId') userId: string): Promise<WhisperSessionSummaryDto[]> {
    const sessions = await this.whisperService.getUserSessions(userId);
    return sessions.map(session => ({
      sessionId: session.sessionId,
      userId: session.userId,
      status: session.status,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      attempts: session.attempts,
      success: session.success,
      averageDecibel: session.averageDecibel,
      bestConfidence: session.bestConfidence,
    }));
  }

  @Get('user/:userId/statistics')
  @ApiOperation({ summary: 'Get user whisper challenge statistics' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved', type: WhisperUserStatisticsDto })
  async getUserStatistics(@Param('userId') userId: string): Promise<WhisperUserStatisticsDto> {
    return await this.whisperService.getUserStatistics(userId);
  }
}
