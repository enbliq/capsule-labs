import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ScheduleModule } from "@nestjs/schedule"
import { TimeSyncCapsuleController } from "./timesync-capsule.controller"
import { TimeSyncCapsuleGateway } from "./timesync-capsule.gateway"
import { TimeServerService } from "./services/time-server.service"
import { PulseBroadcasterService } from "./services/pulse-broadcaster.service"
import { SyncValidatorService } from "./services/sync-validator.service"
import { NotificationService } from "./services/notification.service"
import {
  SyncPulse,
  SyncAttempt,
  TimeSyncCapsuleUnlock,
  NTPSyncLog,
  TimeSyncConfig,
} from "./entities/timesync-capsule.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncPulse, SyncAttempt, TimeSyncCapsuleUnlock, NTPSyncLog, TimeSyncConfig]),
    ScheduleModule.forRoot(),
  ],
  controllers: [TimeSyncCapsuleController],
  providers: [
    TimeServerService,
    PulseBroadcasterService,
    SyncValidatorService,
    NotificationService,
    TimeSyncCapsuleGateway,
  ],
  exports: [TimeServerService, PulseBroadcasterService, SyncValidatorService, NotificationService],
})
export class TimeSyncCapsuleModule {}
