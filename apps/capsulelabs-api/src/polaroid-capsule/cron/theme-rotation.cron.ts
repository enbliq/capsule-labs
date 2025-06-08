import { Injectable, Inject } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import type { Repository } from "typeorm"
import type { DailyTheme } from "../entities/daily-theme.entity"
import type { PhotoTheme } from "../entities/photo-theme.entity"
import { Logger } from "@nestjs/common"

@Injectable()
export class ThemeRotationCron {
  private readonly logger = new Logger(ThemeRotationCron.name);

  constructor(
    @Inject("DailyThemeRepository")
    private dailyThemeRepository: Repository<DailyTheme>,
    @Inject("PhotoThemeRepository")
    private photoThemeRepository: Repository<PhotoTheme>,
  ) {}

  /**
   * Clean up old daily themes to prevent database bloat
   * Runs daily to remove themes older than 30 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldDailyThemes() {
    this.logger.log("Starting daily theme cleanup")

    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const result = await this.dailyThemeRepository
        .createQueryBuilder()
        .delete()
        .where("date < :date", { date: thirtyDaysAgo })
        .execute()

      this.logger.log(`Cleaned up ${result.affected} old daily themes`)
    } catch (error) {
      this.logger.error("Error during daily theme cleanup:", error.stack)
    }
  }

  /**
   * Reset theme usage counts weekly to ensure fair rotation
   * This prevents popular themes from being overused
   */
  @Cron(CronExpression.EVERY_WEEK)
  async resetThemeUsageCounts() {
    this.logger.log("Resetting theme usage counts")

    try {
      const result = await this.photoThemeRepository.createQueryBuilder().update().set({ usageCount: 0 }).execute()

      this.logger.log(`Reset usage counts for ${result.affected} themes`)
    } catch (error) {
      this.logger.error("Error resetting theme usage counts:", error.stack)
    }
  }

  /**
   * Deactivate themes that haven't been used in a long time
   * This helps maintain a fresh rotation of themes
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async deactivateUnusedThemes() {
    this.logger.log("Checking for unused themes to deactivate")

    try {
      // Find themes that haven't been assigned in the last 60 days
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      const unusedThemes = await this.photoThemeRepository
        .createQueryBuilder("theme")
        .leftJoin("daily_themes", "dt", "dt.theme_id = theme.id")
        .where("theme.is_active = :isActive", { isActive: true })
        .andWhere("(dt.created_at IS NULL OR dt.created_at < :date)", { date: sixtyDaysAgo })
        .getMany()

      if (unusedThemes.length > 0) {
        await this.photoThemeRepository
          .createQueryBuilder()
          .update()
          .set({ isActive: false })
          .whereInIds(unusedThemes.map((theme) => theme.id))
          .execute()

        this.logger.log(`Deactivated ${unusedThemes.length} unused themes`)
      } else {
        this.logger.log("No unused themes found to deactivate")
      }
    } catch (error) {
      this.logger.error("Error deactivating unused themes:", error.stack)
    }
  }
}
