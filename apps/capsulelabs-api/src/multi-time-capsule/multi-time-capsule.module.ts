import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ScheduleModule } from "@nestjs/schedule"
import { MultiTimeCapsuleController } from "./multi-time-capsule.controller"
import { TimeZoneService } from "./services/timezone.service"
import { UnlockSessionService } from "./services/unlock-session.service"
import { NotificationService } from "./services/notification.service"
import {
  TimeZoneSettings,
  TimeZoneAccessAttempt,
  TimeZoneUnlockSession,
  TimeZoneCapsuleUnlock,
} from "./entities/multi-time-capsule.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeZoneSettings, TimeZoneAccessAttempt, TimeZoneUnlockSession, TimeZoneCapsuleUnlock]),
    ScheduleModule.forRoot(),
  ],
  controllers: [MultiTimeCapsuleController],
  providers: [TimeZoneService, UnlockSessionService, NotificationService],
  exports: [TimeZoneService, UnlockSessionService, NotificationService],
})
export class MultiTimeCapsuleModule {}
