import { Controller, Get, Param, Query, ParseUUIDPipe, ParseIntPipe } from "@nestjs/common"
import type { DreamLogService } from "../services/dream-log.service"
import type { DreamLog } from "../entities/dream-log.entity"

// Note: You'll need to implement your own authentication guard
// import { AuthGuard } from '@nestjs/passport';
// import { GetUser } from '../auth/get-user.decorator';

@Controller("dream-logs")
// @UseGuards(AuthGuard())
export class DreamLogController {
  constructor(private readonly dreamLogService: DreamLogService) {}

  @Get(":id")
  async getDreamLogById(@Param('id') id: string, @Query('userId') userId: string): Promise<DreamLog> {
    return await this.dreamLogService.getDreamLogById(id, userId)
  }

  @Get("user/:userId")
  async getUserDreamLogs(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<DreamLog[]> {
    return await this.dreamLogService.getUserDreamLogs(userId, limit)
  }

  @Get("today/:userId")
  async getTodaysDreamLog(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('timezone') timezone?: string,
  ): Promise<DreamLog | null> {
    return await this.dreamLogService.getTodaysDreamLog(userId, timezone)
  }
}
