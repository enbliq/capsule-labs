import { Module } from "@nestjs/common"
import { DuelGateway } from "./gateways/duel.gateway"
import { DuelService } from "./services/duel.service"
import { TaskService } from "./services/task.service"
import { LeaderboardService } from "./services/leaderboard.service"
import { DuelController } from "./controllers/duel.controller"

@Module({
  controllers: [DuelController],
  providers: [DuelGateway, DuelService, TaskService, LeaderboardService],
  exports: [DuelService, TaskService, LeaderboardService],
})
export class DuelCapsuleModule {}
