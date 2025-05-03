import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TimeBombCapsule, TimeBombCapsuleSchema } from "./schemas/timebomb-capsule.schema"

@Module({
  imports: [MongooseModule.forFeature([{ name: TimeBombCapsule.name, schema: TimeBombCapsuleSchema }])],
  exports: [MongooseModule],
})
export class TimeBombCapsuleModule {}
