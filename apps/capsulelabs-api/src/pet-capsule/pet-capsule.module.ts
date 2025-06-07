import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { MulterModule } from "@nestjs/platform-express"
import { PetCapsuleController } from "./pet-capsule.controller"
import { ImageProcessingService } from "./services/image-processing.service"
import { MLClassifierService } from "./services/ml-classifier.service"
import { PetVerificationService } from "./services/pet-verification.service"
import { NotificationService } from "./services/notification.service"
import { PetUpload, PetClassification, ManualVerification, PetCapsuleUnlock } from "./entities/pet-upload.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([PetUpload, PetClassification, ManualVerification, PetCapsuleUnlock]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [PetCapsuleController],
  providers: [ImageProcessingService, MLClassifierService, PetVerificationService, NotificationService],
  exports: [ImageProcessingService, MLClassifierService, PetVerificationService, NotificationService],
})
export class PetCapsuleModule {}
