import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, ValidationPipe } from "@nestjs/common"
import type { DreamCapsuleService } from "../services/dream-capsule.service"
import type { CreateDreamCapsuleDto } from "../dto/create-dream-capsule.dto"
import type { LogDreamDto } from "../dto/log-dream.dto"
import type { DreamCapsuleResponseDto, LogDreamResponseDto } from "../dto/dream-capsule-response.dto"

// Note: You'll need to implement your own authentication guard
// import { AuthGuard } from '@nestjs/passport';
// import { GetUser } from '../auth/get-user.decorator';

@Controller("dream-capsules")
// @UseGuards(AuthGuard())
export class DreamCapsuleController {
  constructor(private readonly dreamCapsuleService: DreamCapsuleService) {}

  @Post()
  async createCapsule(
    @Body() createCapsuleDto: CreateDreamCapsuleDto,
  ): Promise<DreamCapsuleResponseDto> {
    return await this.dreamCapsuleService.createCapsule(createCapsuleDto)
  }

  @Get()
  async getUserCapsules(
    @Query('userId') userId: string,
  ): Promise<DreamCapsuleResponseDto[]> {
    return await this.dreamCapsuleService.getUserCapsules(userId)
  }

  @Get(":id")
  async getCapsuleById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId') userId: string,
  ): Promise<DreamCapsuleResponseDto> {
    return await this.dreamCapsuleService.getCapsuleById(id, userId)
  }

  @Post("log-dream")
  async logDream(
    @Query('userId') userId: string,
    @Body(ValidationPipe) logDreamDto: LogDreamDto,
  ): Promise<LogDreamResponseDto> {
    return await this.dreamCapsuleService.logDream(userId, logDreamDto)
  }
}
