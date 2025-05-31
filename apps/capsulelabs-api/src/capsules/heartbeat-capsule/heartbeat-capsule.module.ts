import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { HeartbeatCapsuleController } from "./heartbeat-capsule.controller"
import { HeartbeatCapsuleService } from "./heartbeat-capsule.service"
import { HeartbeatCapsule } from "./entities/heartbeat-capsule.entity"
import { BpmSubmission } from "./entities/bpm-submission.entity"

@Module({
  imports: [TypeOrmModule.forFeature([HeartbeatCapsule, BpmSubmission])],
  controllers: [HeartbeatCapsuleController],
  providers: [HeartbeatCapsuleService],
  exports: [HeartbeatCapsuleService],
})
export class HeartbeatCapsuleModule {}
