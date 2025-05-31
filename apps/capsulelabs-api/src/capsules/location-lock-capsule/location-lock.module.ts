import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { LocationLockController } from "./location-lock.controller"
import { LocationLockService } from "./location-lock.service"
import { LocationLockCapsule } from "./entities/location-lock-capsule.entity"

@Module({
  imports: [TypeOrmModule.forFeature([LocationLockCapsule])],
  controllers: [LocationLockController],
  providers: [LocationLockService],
  exports: [LocationLockService],
})
export class LocationLockModule {}
