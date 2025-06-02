import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ArchiveCapsuleController } from "./archive-capsule.controller"
import { ArchiveCapsuleService } from "./archive-capsule.service"
import { ArchiveCapsule } from "./entities/archive-capsule.entity"
import { MediaEngagement } from "./entities/media-engagement.entity"
import { MediaSession } from "./entities/media-session.entity"
import { MediaEngagementService } from "./services/media-engagement.service"

@Module({
  imports: [TypeOrmModule.forFeature([ArchiveCapsule, MediaEngagement, MediaSession])],
  controllers: [ArchiveCapsuleController],
  providers: [ArchiveCapsuleService, MediaEngagementService],
  exports: [ArchiveCapsuleService],
})
export class ArchiveCapsuleModule {}
