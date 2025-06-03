import { Controller, Post, Get, Body, Query, Param } from "@nestjs/common"
import type { MoodService } from "../services/mood.service"
import type { CreateMoodEntryDto } from "../dto/create-mood-entry.dto"
import type { GetMoodHistoryDto } from "../dto/mood-history.dto"

@Controller("mood")
export class MoodController {
  constructor(private readonly moodService: MoodService) {}

  @Post('entries')
  async createMoodEntry(@Body() createMoodEntryDto: CreateMoodEntryDto) {
    return this.moodService.createMoodEntry(createMoodEntryDto);
  }

  @Get('history')
  async getMoodHistory(@Query() params: GetMoodHistoryDto) {
    return this.moodService.getMoodHistory(params);
  }

  @Get("consistency/:userId")
  async checkMoodConsistency(
    @Param('userId') userId: string,
    @Query('days') days?: number,
    @Query('threshold') threshold?: number,
  ) {
    return this.moodService.checkMoodConsistency(
      userId,
      days ? Number.parseInt(days.toString()) : 3,
      threshold ? Number.parseFloat(threshold.toString()) : 0.7,
    )
  }

  @Get("trend/:userId")
  async getMoodTrend(@Param('userId') userId: string, @Query('days') days?: number) {
    return this.moodService.getRecentMoodTrend(userId, days ? Number.parseInt(days.toString()) : 7)
  }
}
