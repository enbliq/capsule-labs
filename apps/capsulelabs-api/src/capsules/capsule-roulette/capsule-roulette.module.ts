import { Module } from "@nestjs/common"
import { ScheduleModule } from "@nestjs/schedule"
import { CacheModule } from "@nestjs/cache-manager"
import { CapsuleRouletteController } from "./controllers/capsule-roulette.controller"
import { CapsuleRouletteService } from "./services/capsule-roulette.service"
import { RandomDropSchedulerService } from "./services/random-drop-scheduler.service"
import { ClaimGuardService } from "./services/claim-guard.service"
import { StrkRewardService } from "./services/strk-reward.service"
import { NotificationService } from "./services/notification.service"
import { RouletteAnalyticsService } from "./services/roulette-analytics.service"
import { RouletteGateway } from "./gateways/roulette.gateway"

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 1000, // Maximum number of items in cache
    }),
  ],
  controllers: [CapsuleRouletteController],
  providers: [
    CapsuleRouletteService,
    RandomDropSchedulerService,
    ClaimGuardService,
    StrkRewardService,
    NotificationService,
    RouletteAnalyticsService,
    RouletteGateway,
  ],
  exports: [CapsuleRouletteService, StrkRewardService],
})
export class CapsuleRouletteModule {}
