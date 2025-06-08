import { Injectable } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { ShadowCapsule } from "../entities/shadow-capsule.entity"
import type { TwilightCalculationService } from "../services/twilight-calculation.service"
import { Logger } from "@nestjs/common"

@Injectable()
export class TwilightUpdateCron {
  private readonly logger = new Logger(TwilightUpdateCron.name);

  constructor(
    private twilightCalculationService: TwilightCalculationService,
    @InjectRepository(ShadowCapsule)
    private shadowCapsuleRepository: Repository<ShadowCapsule>,
  ) {}

  /**
   * Update twilight times for all capsules twice daily
   * This ensures that capsules have accurate twilight times
   */
  @Cron(CronExpression.EVERY_12_HOURS)
  async updateAllCapsuleTwilightTimes() {
    this.logger.log("Updating twilight times for all shadow capsules")

    try {
      // Get all locked capsules
      const capsules = await this.shadowCapsuleRepository.find({
        where: { status: "locked" },
      })

      this.logger.log(`Found ${capsules.length} locked shadow capsules to update`)

      for (const capsule of capsules) {
        const twilightTimes = this.twilightCalculationService.calculateTwilightTimes(
          capsule.latitude,
          capsule.longitude,
        )

        // Update the capsule with new twilight times
        await this.shadowCapsuleRepository.update(capsule.id, {
          lastTwilightStart: twilightTimes.twilightStart,
          lastTwilightEnd: twilightTimes.twilightEnd,
          nextTwilightStart: twilightTimes.nextTwilightStart,
          nextTwilightEnd: twilightTimes.nextTwilightEnd,
        })
      }

      this.logger.log("Successfully updated twilight times for all shadow capsules")
    } catch (error) {
      this.logger.error("Error updating twilight times", error.stack)
    }
  }
}
