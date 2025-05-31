import { Module } from "@nestjs/common"
import { QrCapsuleController } from "./controllers/qr-capsule.controller"
import { QrCapsuleService } from "./services/qr-capsule.service"
import { QrCodeService } from "./services/qr-code.service"
import { GeoValidationService } from "./services/geo-validation.service"
import { TimeValidationService } from "./services/time-validation.service"

@Module({
  controllers: [QrCapsuleController],
  providers: [QrCapsuleService, QrCodeService, GeoValidationService, TimeValidationService],
  exports: [QrCapsuleService, QrCodeService],
})
export class QrCapsuleModule {}
