import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { HttpModule } from "@nestjs/axios"
import { WhisperCapsuleController } from "./whisper-capsule.controller"
import { WhisperCapsuleService } from "./whisper-capsule.service"
import { WhisperCapsule } from "./entities/whisper-capsule.entity"
import { WeatherCheck } from "./entities/weather-check.entity"
import { WeatherService } from "./services/weather.service"

@Module({
  imports: [TypeOrmModule.forFeature([WhisperCapsule, WeatherCheck]), HttpModule],
  controllers: [WhisperCapsuleController],
  providers: [WhisperCapsuleService, WeatherService],
  exports: [WhisperCapsuleService],
})
export class WhisperCapsuleModule {}
