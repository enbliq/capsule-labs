import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ReflectionCapsuleController } from "./reflection-capsule.controller"
import { ReflectionService } from "./services/reflection.service"
import { ReflectionStreakService } from "./services/reflection-streak.service"
import { PromptService } from "./services/prompt.service"
import { NotificationService } from "./services/notification.service"
import { DailyReflection, ReflectionStreak, ReflectionPrompt } from "./entities/reflection.entity"

@Module({
  imports: [TypeOrmModule.forFeature([DailyReflection, ReflectionStreak, ReflectionPrompt])],
  controllers: [ReflectionCapsuleController],
  providers: [ReflectionService, ReflectionStreakService, PromptService, NotificationService],
  exports: [ReflectionService, ReflectionStreakService, PromptService, NotificationService],
})
export class ReflectionCapsuleModule {}
