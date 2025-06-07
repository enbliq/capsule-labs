import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { CapsulesController } from "./capsules.controller"
import { TaskGeneratorService } from "./services/task-generator.service"
import { SensorHandlerService } from "./services/sensor-handler.service"
import { ProgressTrackerService } from "./services/progress-tracker.service"
import { SenseTask, UserSenseProgress } from "./entities/sense-task.entity"

@Module({
  imports: [TypeOrmModule.forFeature([SenseTask, UserSenseProgress])],
  controllers: [CapsulesController],
  providers: [TaskGeneratorService, SensorHandlerService, ProgressTrackerService],
  exports: [TaskGeneratorService, SensorHandlerService, ProgressTrackerService],
})
export class CapsulesModule {}
