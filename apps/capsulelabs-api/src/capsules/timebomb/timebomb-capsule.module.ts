import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TimeBombCapsule, TimeBombCapsuleSchema } from "./schemas/timebomb-capsule.schema"
import { TimeBombCapsuleController } from "./timebomb-capsule.controller"
import { TimeBombCapsuleService } from "./timebomb-capsule.service"
import { UsersModule } from "../../users/users.module"

@Module({
  imports: [MongooseModule.forFeature([{ name: TimeBombCapsule.name, schema: TimeBombCapsuleSchema }]), UsersModule],
  controllers: [TimeBombCapsuleController],
  providers: [TimeBombCapsuleService],
  exports: [MongooseModule, TimeBombCapsuleService],
})
export class TimeBombCapsuleModule {}
