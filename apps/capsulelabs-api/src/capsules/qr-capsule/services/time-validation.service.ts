import { Injectable } from "@nestjs/common"
import type { TimeWindow } from "../entities/qr-capsule.entity"

@Injectable()
export class TimeValidationService {
  /**
   * Check if current time is within the specified time window
   */
  isWithinTimeWindow(timeWindow: TimeWindow): boolean {
    const now = new Date()

    // Check day of week if specified
    if (timeWindow.daysOfWeek && timeWindow.daysOfWeek.length > 0) {
      const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      if (!timeWindow.daysOfWeek.includes(currentDay)) {
        return false
      }
    }

    // Check time range
    const currentTime = this.formatTime(now)
    return this.isTimeInRange(currentTime, timeWindow.startTime, timeWindow.endTime)
  }

  /**
   * Check if a time is within a specified range
   */
  private isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
    const current = this.timeToMinutes(currentTime)
    const start = this.timeToMinutes(startTime)
    const end = this.timeToMinutes(endTime)

    // Handle overnight time windows (e.g., 22:00 to 06:00)
    if (start > end) {
      return current >= start || current <= end
    }

    return current >= start && current <= end
  }

  /**
   * Convert time string (HH:MM) to minutes since midnight
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number)
    return hours * 60 + minutes
  }

  /**
   * Format Date object to HH:MM string
   */
  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5) // Extract HH:MM
  }

  /**
   * Get next available time window
   */
  getNextAvailableTime(timeWindow: TimeWindow): Date | null {
    if (!timeWindow.daysOfWeek || timeWindow.daysOfWeek.length === 0) {
      // If no specific days, next availability is tomorrow at start time
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const [hours, minutes] = timeWindow.startTime.split(":").map(Number)
      tomorrow.setHours(hours, minutes, 0, 0)
      return tomorrow
    }

    // Find next available day
    const now = new Date()
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(now)
      checkDate.setDate(now.getDate() + i)

      if (timeWindow.daysOfWeek.includes(checkDate.getDay())) {
        const [hours, minutes] = timeWindow.startTime.split(":").map(Number)
        checkDate.setHours(hours, minutes, 0, 0)
        return checkDate
      }
    }

    return null
  }

  /**
   * Validate time window format
   */
  validateTimeWindow(timeWindow: TimeWindow): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

    if (!timeRegex.test(timeWindow.startTime) || !timeRegex.test(timeWindow.endTime)) {
      return false
    }

    if (timeWindow.daysOfWeek) {
      return timeWindow.daysOfWeek.every((day) => day >= 0 && day <= 6)
    }

    return true
  }
}
