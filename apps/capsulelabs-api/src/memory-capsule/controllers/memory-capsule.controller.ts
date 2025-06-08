import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, ValidationPipe } from "@nestjs/common"
import type { MemoryCapsuleService } from "../services/memory-capsule.service"
import type { CreateMemoryCapsuleDto } from "../dto/create-memory-capsule.dto"
import type { AnswerMemoryQuestionDto } from "../dto/answer-memory-question.dto"
import type { CreateDailyLogDto } from "../dto/create-daily-log.dto"
import type { MemoryCapsuleResponseDto, UnlockAttemptResponseDto } from "../dto/memory-capsule-response.dto"
import type { DailyLog } from "../entities/daily-log.entity"

// Note: You'll need to implement your own authentication guard
// import { AuthGuard } from '@nestjs/passport';
// import { GetUser } from '../auth/get-user.decorator';

@Controller("memory-capsules")
// @UseGuards(AuthGuard())
export class MemoryCapsuleController {
  constructor(private readonly memoryCapsuleService: MemoryCapsuleService) {}

  @Post()
  async createCapsule(
    @Body() createCapsuleDto: CreateMemoryCapsuleDto,
  ): Promise<MemoryCapsuleResponseDto> {
    return await this.memoryCapsuleService.createCapsule(createCapsuleDto);
  }

  @Get()
  async getUserCapsules(
    @Query('userId') userId: string,
  ): Promise<MemoryCapsuleResponseDto[]> {
    return await this.memoryCapsuleService.getUserCapsules(userId);
  }

  @Get(":id")
  async getCapsuleById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId') userId: string,
  ): Promise<MemoryCapsuleResponseDto> {
    return await this.memoryCapsuleService.getCapsuleById(id, userId)
  }

  @Post(":id/unlock")
  async attemptUnlock(
    @Param('id', ParseUUIDPipe) capsuleId: string,
    @Body(ValidationPipe) answerDto: AnswerMemoryQuestionDto,
    @Query('userId') userId: string,
  ): Promise<UnlockAttemptResponseDto> {
    return await this.memoryCapsuleService.attemptUnlock(capsuleId, answerDto, userId)
  }

  @Post('daily-logs')
  async createDailyLog(
    @Body(ValidationPipe) createDailyLogDto: CreateDailyLogDto,
  ): Promise<DailyLog> {
    return await this.memoryCapsuleService.createDailyLog(createDailyLogDto);
  }

  @Get("daily-logs/:userId")
  async getUserDailyLogs(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: number,
  ): Promise<DailyLog[]> {
    return await this.memoryCapsuleService.getUserDailyLogs(userId, limit)
  }
}
