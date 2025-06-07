import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ScheduleModule } from "@nestjs/schedule"
import { AlarmCapsuleController } from "./alarm-capsule.controller"
import { AlarmSchedulerService } from "./services/alarm-scheduler.service"
import { AlarmStreakService } from "./services/alarm-streak.service"
import { WakeUpTrackerService } from "./services/wake-up-tracker.service"
import { NotificationService } from "./services/notification.service"
import { AlarmSettings, WakeUpLog, AlarmStreak } from "./entities/alarm-capsule.entity"

@Module({
  imports: [TypeOrmModule.forFeature([AlarmSettings, WakeUpLog, AlarmStreak]), ScheduleModule.forRoot()],
  controllers: [AlarmCapsuleController],
  providers: [AlarmSchedulerService, AlarmStreakService, WakeUpTrackerService, NotificationService],
  exports: [AlarmSchedulerService, AlarmStreakService, WakeUpTrackerService, NotificationService],
})
export class AlarmCapsuleModule {}
