import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { HttpModule } from "@nestjs/axios"
import { MoodEntry } from "./entities/mood-entry.entity"
import { MoodCapsule } from "./entities/mood-capsule.entity"
import { MoodController } from "./controllers/mood.controller"
import { CapsuleController } from "./controllers/capsule.controller"
import { MoodService } from "./services/mood.service"
import { CapsuleService } from "./services/capsule.service"
import { SentimentService } from "./services/sentiment.service"

@Module({
  imports: [TypeOrmModule.forFeature([MoodEntry, MoodCapsule]), HttpModule],
  controllers: [MoodController, CapsuleController],
  providers: [MoodService, CapsuleService, SentimentService],
  exports: [MoodService, CapsuleService],
})
export class MoodCapsuleModule {}
