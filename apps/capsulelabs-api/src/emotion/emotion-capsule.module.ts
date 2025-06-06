import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { EmotionCapsule } from "./entities/emotion-capsule.entity"
import { EmotionCapsuleController } from "./emotion-capsule.controller"
import { EmotionCapsuleService } from "./emotion-capsule.service"

@Module({
  imports: [TypeOrmModule.forFeature([EmotionCapsule])],
  controllers: [EmotionCapsuleController],
  providers: [EmotionCapsuleService],
  exports: [EmotionCapsuleService],
})
export class EmotionCapsuleModule {}
