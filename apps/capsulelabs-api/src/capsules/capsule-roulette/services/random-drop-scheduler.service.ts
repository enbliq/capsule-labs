import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { randomBytes } from "crypto"
import type { RouletteCapsuleDrop, DailyDropSchedule, BlackoutPeriod } from "../entities/capsule-roulette.entity"

@Injectable()
export class RandomDropSchedulerService {
  private readonly logger = new Logger(RandomDropSchedulerService.name)
  private scheduledDrops = new Map<string, NodeJS.Timeout>()
  private dailySchedules = new Map<string, DailyDropSchedule>()
  private blackoutPeriods: BlackoutPeriod[] = []

  constructor() {
    this.initializeBlackoutPeriods()
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduleDailyDrop(): Promise<void> {
    this.logger.log("Scheduling daily capsule drop...")

    try {
      const today = new Date()
      const todayKey = this.getDateKey(today)

      // Check if already scheduled for today
      if (this.dailySchedules.has(todayKey)) {
        this.logger.log("Drop already scheduled for today")
        return
      }

      // Generate random drop time
      const dropTime = await this.generateRandomDropTime(today)

      // Create daily schedule
      const schedule: DailyDropSchedule = {
        date: today,
        scheduledTime: dropTime,
        timeWindow: {
          earliest: this.getEarliestDropTime(today),
          latest: this.getLatestDropTime(today),
        },
        blackoutPeriods: this.getBlackoutPeriodsForDate(today),
        estimatedParticipants: await this.estimateParticipants(),
      }

      this.dailySchedules.set(todayKey, schedule)

      // Schedule the actual drop
      const timeUntilDrop = dropTime.getTime() - Date.now()
      if (timeUntilDrop > 0) {
        const timeout = setTimeout(async () => {
          await this.triggerScheduledDrop(todayKey)
        }, timeUntilDrop)

        this.scheduledDrops.set(todayKey, timeout)
        this.logger.log(`Daily drop scheduled for ${dropTime.toISOString()}`)
      } else {
        this.logger.warn("Generated drop time is in the past, scheduling for next available slot")
        await this.scheduleNextAvailableSlot()
      }
    } catch (error) {
      this.logger.error("Failed to schedule daily drop:", error)
    }
  }

  async generateRandomDropTime(targetDate?: Date): Promise<Date> {
    const date = targetDate || new Date()

    // Define drop window (6 AM to 11 PM)
    const startHour = 6
    const endHour = 23

    // Generate cryptographically secure random time
    const totalMinutes = (endHour - startHour) * 60
    const randomBuffer = randomBytes(4)
    const randomValue = randomBuffer.readUInt32BE(0)
    const randomMinutes = randomValue % totalMinutes

    const dropTime = new Date(date)
    dropTime.setHours(startHour, 0, 0, 0)
    dropTime.setMinutes(dropTime.getMinutes() + randomMinutes)

    // Ensure not in blackout period
    if (this.isInBlackoutPeriod(dropTime)) {
      return this.findNextAvailableTime(dropTime)
    }

    return dropTime
  }

  async scheduleDrop(drop: RouletteCapsuleDrop): Promise<void> {
    const dropKey = drop.id
    const timeUntilDrop = drop.scheduledDropTime.getTime() - Date.now()

    if (timeUntilDrop <= 0) {
      this.logger.warn(`Drop ${dropKey} scheduled time is in the past, executing immediately`)
      await this.executeDrop(drop)
      return
    }

    const timeout = setTimeout(async () => {
      await this.executeDrop(drop)
    }, timeUntilDrop)

    this.scheduledDrops.set(dropKey, timeout)
    this.logger.log(`Drop ${dropKey} scheduled for ${drop.scheduledDropTime.toISOString()}`)
  }

  async scheduleExpiration(drop: RouletteCapsuleDrop): Promise<void> {
    const expirationKey = `${drop.id}_expiration`
    const timeUntilExpiration = drop.expiresAt.getTime() - Date.now()

    if (timeUntilExpiration <= 0) {
      return
    }

    const timeout = setTimeout(async () => {
      // This would call back to the main service to expire the drop
      this.logger.log(`Drop ${drop.id} expired`)
    }, timeUntilExpiration)

    this.scheduledDrops.set(expirationKey, timeout)
  }

  async getNextScheduledDrop(): Promise<RouletteCapsuleDrop | null> {
    // This would return the next scheduled drop from the main service
    // For now, returning null as this requires integration with CapsuleRouletteService
    return null
  }

  cancelScheduledDrop(dropId: string): void {
    const timeout = this.scheduledDrops.get(dropId)
    if (timeout) {
      clearTimeout(timeout)
      this.scheduledDrops.delete(dropId)
      this.logger.log(`Cancelled scheduled drop ${dropId}`)
    }
  }

  getDailySchedule(date: Date): DailyDropSchedule | null {
    const dateKey = this.getDateKey(date)
    return this.dailySchedules.get(dateKey) || null
  }

  addBlackoutPeriod(blackout: BlackoutPeriod): void {
    this.blackoutPeriods.push(blackout)
    this.logger.log(`Added blackout period: ${blackout.reason}`)
  }

  removeBlackoutPeriod(reason: string): void {
    this.blackoutPeriods = this.blackoutPeriods.filter((bp) => bp.reason !== reason)
    this.logger.log(`Removed blackout period: ${reason}`)
  }

  getBlackoutPeriods(): BlackoutPeriod[] {
    return [...this.blackoutPeriods]
  }

  private async triggerScheduledDrop(scheduleKey: string): Promise<void> {
    try {
      const schedule = this.dailySchedules.get(scheduleKey)
      if (!schedule) {
        this.logger.error(`No schedule found for key ${scheduleKey}`)
        return
      }

      // This would integrate with CapsuleRouletteService to create and execute the drop
      this.logger.log(`Triggering scheduled drop for ${schedule.date.toISOString()}`)

      // Clean up
      this.scheduledDrops.delete(scheduleKey)
    } catch (error) {
      this.logger.error(`Failed to trigger scheduled drop ${scheduleKey}:`, error)
    }
  }

  private async executeDrop(drop: RouletteCapsuleDrop): Promise<void> {
    try {
      // This would call back to CapsuleRouletteService.performDrop()
      this.logger.log(`Executing drop ${drop.id}`)

      // Clean up scheduled timeout
      this.scheduledDrops.delete(drop.id)
    } catch (error) {
      this.logger.error(`Failed to execute drop ${drop.id}:`, error)
    }
  }

  private isInBlackoutPeriod(time: Date): boolean {
    return this.blackoutPeriods.some((period) => {
      if (period.recurring) {
        // Handle recurring blackouts (e.g., daily maintenance)
        const timeOfDay = time.getHours() * 60 + time.getMinutes()
        const startTime = period.start.getHours() * 60 + period.start.getMinutes()
        const endTime = period.end.getHours() * 60 + period.end.getMinutes()

        if (startTime <= endTime) {
          return timeOfDay >= startTime && timeOfDay <= endTime
        } else {
          // Overnight period
          return timeOfDay >= startTime || timeOfDay <= endTime
        }
      } else {
        // One-time blackout
        return time >= period.start && time <= period.end
      }
    })
  }

  private findNextAvailableTime(startTime: Date): Date {
    const candidateTime = new Date(startTime)
    candidateTime.setMinutes(candidateTime.getMinutes() + 15) // 15-minute increments

    // Try for up to 24 hours
    const maxAttempts = 96 // 24 hours / 15 minutes
    let attempts = 0

    while (attempts < maxAttempts) {
      if (!this.isInBlackoutPeriod(candidateTime)) {
        return candidateTime
      }

      candidateTime.setMinutes(candidateTime.getMinutes() + 15)
      attempts++
    }

    // Fallback to original time if no slot found
    this.logger.warn("Could not find available time slot, using original time")
    return startTime
  }

  private async scheduleNextAvailableSlot(): Promise<void> {
    const now = new Date()
    const nextSlot = this.findNextAvailableTime(now)

    // Create immediate drop for next available slot
    this.logger.log(`Scheduling immediate drop for next available slot: ${nextSlot.toISOString()}`)
  }

  private getEarliestDropTime(date: Date): Date {
    const earliest = new Date(date)
    earliest.setHours(6, 0, 0, 0)
    return earliest
  }

  private getLatestDropTime(date: Date): Date {
    const latest = new Date(date)
    latest.setHours(23, 0, 0, 0)
    return latest
  }

  private getBlackoutPeriodsForDate(date: Date): BlackoutPeriod[] {
    return this.blackoutPeriods.filter((period) => {
      if (period.recurring) {
        return true // Recurring periods apply to all dates
      } else {
        // Check if the specific date falls within the blackout period
        const dateStart = new Date(date)
        dateStart.setHours(0, 0, 0, 0)
        const dateEnd = new Date(date)
        dateEnd.setHours(23, 59, 59, 999)

        return period.start <= dateEnd && period.end >= dateStart
      }
    })
  }

  private async estimateParticipants(): Promise<number> {
    // This would integrate with user analytics to estimate active users
    // For now, returning a mock estimate
    return Math.floor(Math.random() * 1000) + 500
  }

  private initializeBlackoutPeriods(): void {
    // Add default blackout periods
    this.blackoutPeriods = [
      {
        start: new Date(0, 0, 0, 2, 0), // 2:00 AM
        end: new Date(0, 0, 0, 4, 0), // 4:00 AM
        reason: "Daily maintenance window",
        recurring: true,
      },
    ]
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split("T")[0]
  }
}
