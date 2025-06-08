import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, ValidationPipe } from "@nestjs/common"
import type { RiddleCapsuleService } from "../services/riddle-capsule.service"
import type { CreateRiddleCapsuleDto } from "../dto/create-riddle-capsule.dto"
import type { AnswerRiddleDto } from "../dto/answer-riddle.dto"
import type { RiddleCapsuleResponseDto, RiddleAttemptResponseDto } from "../dto/riddle-capsule-response.dto"

// Note: You'll need to implement your own authentication guard
// import { AuthGuard } from '@nestjs/passport';
// import { GetUser } from '../auth/get-user.decorator';

@Controller("riddle-capsules")
// @UseGuards(AuthGuard())
export class RiddleCapsuleController {
  constructor(private readonly riddleCapsuleService: RiddleCapsuleService) {}

  @Post()
  async createCapsule(
    @Body(new ValidationPipe()) createCapsuleDto: CreateRiddleCapsuleDto,
  ): Promise<RiddleCapsuleResponseDto> {
    return await this.riddleCapsuleService.createCapsule(createCapsuleDto)
  }

  @Get()
  async getUserCapsules(
    @Query('userId') userId: string,
  ): Promise<RiddleCapsuleResponseDto[]> {
    return await this.riddleCapsuleService.getUserCapsules(userId)
  }

  @Get(":id")
  async getCapsuleById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId') userId: string,
  ): Promise<RiddleCapsuleResponseDto> {
    return await this.riddleCapsuleService.getCapsuleById(id, userId)
  }

  @Post(":id/answer")
  async attemptRiddleAnswer(
    @Param('id', ParseUUIDPipe) capsuleId: string,
    @Query('userId') userId: string,
    @Body(ValidationPipe) answerDto: AnswerRiddleDto,
  ): Promise<RiddleAttemptResponseDto> {
    return await this.riddleCapsuleService.attemptRiddleAnswer(capsuleId, userId, answerDto)
  }

  @Post(":id/hint")
  async requestHint(
    @Param('id', ParseUUIDPipe) capsuleId: string,
    @Query('userId') userId: string,
  ): Promise<{ hint: string }> {
    return await this.riddleCapsuleService.requestHint(capsuleId, userId)
  }
}
