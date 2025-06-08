import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { HttpModule } from "@nestjs/axios"
import { PolaroidCapsuleController } from "./controllers/polaroid-capsule.controller"
import { ThemeController } from "./controllers/theme.controller"
import { PhotoSubmissionController } from "./controllers/photo-submission.controller"
import { PolaroidCapsuleService } from "./services/polaroid-capsule.service"
import { ThemeService } from "./services/theme.service"
import { PhotoSubmissionService } from "./services/photo-submission.service"
import { ObjectDetectionService } from "./services/object-detection.service"
import { PolaroidCapsule } from "./entities/polaroid-capsule.entity"
import { PhotoTheme } from "./entities/photo-theme.entity"
import { DailyTheme } from "./entities/daily-theme.entity"
import { PhotoSubmission } from "./entities/photo-submission.entity"
import { PolaroidCapsuleInteractionLog } from "./entities/polaroid-capsule-interaction-log.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([PolaroidCapsule, PhotoTheme, DailyTheme, PhotoSubmission, PolaroidCapsuleInteractionLog]),
    HttpModule,
  ],
  controllers: [PolaroidCapsuleController, ThemeController, PhotoSubmissionController],
  providers: [PolaroidCapsuleService, ThemeService, PhotoSubmissionService, ObjectDetectionService],
  exports: [PolaroidCapsuleService, ThemeService, PhotoSubmissionService],
})
export class PolaroidCapsuleModule {}
