import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { DaylightCapsuleController } from "./daylight-capsule.controller"
import { DaylightCapsuleService } from "./daylight-capsule.service"
import { DaylightCapsule } from "./entities/daylight-capsule.entity"

@Module({
  imports: [TypeOrmModule.forFeature([DaylightCapsule])],
  controllers: [DaylightCapsuleController],
  providers: [DaylightCapsuleService],
  exports: [DaylightCapsuleService],
})
export class DaylightCapsuleModule {}
