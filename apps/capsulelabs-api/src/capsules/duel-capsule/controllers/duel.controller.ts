import { Controller, Get, Param, Query } from "@nestjs/common"
import type { DuelService } from "../services/duel.service"
import type { LeaderboardService } from "../services/leaderboard.service"

@Controller("duel")
export class DuelController {
  constructor(
    private readonly duelService: DuelService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  @Get('room/:roomId')
  getRoom(@Param('roomId') roomId: string) {
    const room = this.duelService.getRoom(roomId);

    if (!room) {
      return { error: 'Room not found' };
    }

    return room;
  }

  @Get('player/:playerId/room')
  getPlayerRoom(@Param('playerId') playerId: string) {
    const room = this.duelService.getPlayerRoom(playerId);
    if (!room) {
      return { error: 'Player not in any room' };
    }
    return room;
  }

  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit?: string) {
    const limitNum = limit ? Number.parseInt(limit, 10) : 10;
    return this.leaderboardService.getLeaderboard(limitNum);
  }

  @Get('player/:playerId/stats')
  getPlayerStats(@Param('playerId') playerId: string) {
    const stats = this.leaderboardService.getPlayerStats(playerId);
    if (!stats) {
      return { error: 'Player stats not found' };
    }
    return stats;
  }
}
