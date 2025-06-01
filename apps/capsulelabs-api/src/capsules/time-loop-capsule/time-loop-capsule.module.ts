import { Module } from "@nestjs/common"
import { ScheduleModule } from "@nestjs/schedule"
import { TimeLoopCapsuleController } from "./controllers/time-loop-capsule.controller"
import { TimeLoopCapsuleService } from "./services/time-loop-capsule.service"
import { DailyTaskService } from "./services/daily-task.service"
import { StreakManagementService } from "./services/streak-management.service"
import { TaskValidationService } from "./services/task-validation.service"
import { CapsuleStateMachineService } from "./services/capsule-state-machine.service"
import { DailySchedulerService } from "./services/daily-scheduler.service"

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [TimeLoopCapsuleController],
  providers: [
    TimeLoopCapsuleService,
    DailyTaskService,
    StreakManagementService,
    TaskValidationService,
    CapsuleStateMachineService,
    DailySchedulerService,
  ],
  exports: [TimeLoopCapsuleService, DailyTaskService],
})
export class TimeLoopCapsuleModule {}
