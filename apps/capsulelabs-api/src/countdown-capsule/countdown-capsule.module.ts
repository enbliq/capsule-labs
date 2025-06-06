import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { CountdownCapsule } from "./entities/countdown-capsule.entity"
import { CountdownCapsuleController } from "./countdown-capsule.controller"
import { CountdownCapsuleService } from "./countdown-capsule.service"

@Module({
  imports: [TypeOrmModule.forFeature([CountdownCapsule])],
  controllers: [CountdownCapsuleController],
  providers: [CountdownCapsuleService],
  exports: [CountdownCapsuleService],
})
export class CountdownCapsuleModule {}
