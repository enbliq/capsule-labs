import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { MulterModule } from "@nestjs/platform-express"
import { EchoCapsule } from "./entities/echo-capsule.entity"
import { EchoCapsuleController } from "./controllers/echo-capsule.controller"
import { EchoCapsuleService } from "./services/echo-capsule.service"
import { AudioAnalysisService } from "./services/audio-analysis.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([EchoCapsule]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          "audio/wav",
          "audio/wave",
          "audio/x-wav",
          "audio/mpeg",
          "audio/mp3",
          "audio/mp4",
          "audio/m4a",
          "audio/ogg",
          "audio/webm",
        ]

        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true)
        } else {
          callback(new Error(`Unsupported audio format: ${file.mimetype}`), false)
        }
      },
    }),
  ],
  controllers: [EchoCapsuleController],
  providers: [EchoCapsuleService, AudioAnalysisService],
  exports: [EchoCapsuleService, AudioAnalysisService],
})
export class EchoCapsuleModule {}
