import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TimeBombCapsule, TimeBombCapsuleSchema } from "./schemas/timebomb-capsule.schema"
import { TimeBombCapsuleController } from "./timebomb-capsule.controller"
import { TimeBombCapsuleService } from "./timebomb-capsule.service"
import { TimeBombExpiryService } from "./timebomb-expiry.service"
import { UsersModule } from "../../users/users.module"
import { NotificationsModule } from "../../notifications/notifications.module"

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TimeBombCapsule.name, schema: TimeBombCapsuleSchema }]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [TimeBombCapsuleController],
  providers: [TimeBombCapsuleService, TimeBombExpiryService],
  exports: [MongooseModule, TimeBombCapsuleService],
})
export class TimeBombCapsuleModule {}
