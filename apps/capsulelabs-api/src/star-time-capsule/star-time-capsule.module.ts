import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { StarTimeCapsule } from "./entities/star-time-capsule.entity"
import { StarTimeCapsuleController } from "./controllers/star-time-capsule.controller"
import { StarTimeCapsuleService } from "./services/star-time-capsule.service"
import { AstronomyService } from "./services/astronomy.service"

@Module({
  imports: [TypeOrmModule.forFeature([StarTimeCapsule])],
  controllers: [StarTimeCapsuleController],
  providers: [StarTimeCapsuleService, AstronomyService],
  exports: [StarTimeCapsuleService, AstronomyService],
})
export class StarTimeCapsuleModule {}
