import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, ValidationPipe, ParseIntPipe } from "@nestjs/common"
import type { StreakCapsuleService } from "../services/streak-capsule.service"
import type { CreateStreakCapsuleDto } from "../dto/create-streak-capsule.dto"
import type { CheckInDto } from "../dto/check-in.dto"
import type { StreakCapsuleResponseDto, CheckInResponseDto, StreakStatsDto } from "../dto/streak-capsule-response.dto"
import type { DailyCheckIn } from "../entities/daily-check-in.entity"

// Note: You'll need to implement your own authentication guard
// import { AuthGuard } from '@nestjs/passport';
// import { GetUser } from '../auth/get-user.decorator';

@Controller("streak-capsules")
// @UseGuards(AuthGuard())
export class StreakCapsuleController {
  constructor(private readonly streakCapsuleService: StreakCapsuleService) {}

  @Post()
  async createCapsule(
    @Body() createCapsuleDto: CreateStreakCapsuleDto,
  ): Promise<StreakCapsuleResponseDto> {
    return await this.streakCapsuleService.createCapsule(createCapsuleDto)
  }

  @Get()
  async getUserCapsules(
    @Query('userId') userId: string,
  ): Promise<StreakCapsuleResponseDto[]> {
    return await this.streakCapsuleService.getUserCapsules(userId)
  }

  @Get(":id")
  async getCapsuleById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId') userId: string,
  ): Promise<StreakCapsuleResponseDto> {
    return await this.streakCapsuleService.getCapsuleById(id, userId)
  }

  @Post("check-in")
  async checkIn(
    @Query('userId') userId: string,
    @Body(ValidationPipe) checkInDto: CheckInDto,
  ): Promise<CheckInResponseDto> {
    return await this.streakCapsuleService.checkIn(userId, checkInDto)
  }

  @Get("stats/:userId")
  async getStreakStats(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('timezone') timezone?: string,
  ): Promise<StreakStatsDto> {
    return await this.streakCapsuleService.getStreakStats(userId, timezone)
  }

  @Get("check-ins/:userId")
  async getUserCheckIns(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<DailyCheckIn[]> {
    return await this.streakCapsuleService.getUserCheckIns(userId, limit)
  }
}
