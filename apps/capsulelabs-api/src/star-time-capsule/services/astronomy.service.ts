import { Injectable, Logger } from "@nestjs/common"
import { AstronomicalEventType } from "../enums/astronomical-event.enum"

interface AstronomicalEvent {
  type: AstronomicalEventType
  date: Date
  name: string
}

@Injectable()
export class AstronomyService {
  private readonly logger = new Logger(AstronomyService.name)

  /**
   * Calculate the next occurrence of a specific astronomical event
   */
  async getNextEventDate(eventType: AstronomicalEventType): Promise<Date> {
    const now = new Date()

    switch (eventType) {
      case AstronomicalEventType.FULL_MOON:
        return this.calculateNextFullMoon(now)
      case AstronomicalEventType.NEW_MOON:
        return this.calculateNextNewMoon(now)
      case AstronomicalEventType.SUMMER_SOLSTICE:
        return this.calculateNextSummerSolstice(now)
      case AstronomicalEventType.WINTER_SOLSTICE:
        return this.calculateNextWinterSolstice(now)
      case AstronomicalEventType.SPRING_EQUINOX:
        return this.calculateNextSpringEquinox(now)
      case AstronomicalEventType.AUTUMN_EQUINOX:
        return this.calculateNextAutumnEquinox(now)
      default:
        // For complex events, we'd integrate with NASA API
        return this.fetchFromNASAAPI(eventType)
    }
  }

  /**
   * Check if an astronomical event is currently occurring (within tolerance)
   */
  isEventOccurring(expectedDate: Date, toleranceHours = 24): boolean {
    const now = new Date()
    const timeDiff = Math.abs(now.getTime() - expectedDate.getTime())
    const toleranceMs = toleranceHours * 60 * 60 * 1000

    return timeDiff <= toleranceMs
  }

  /**
   * Get upcoming astronomical events for the next year
   */
  async getUpcomingEvents(months = 12): Promise<AstronomicalEvent[]> {
    const events: AstronomicalEvent[] = []
    const now = new Date()
    const endDate = new Date(now.getFullYear(), now.getMonth() + months, now.getDate())

    // Calculate major events
    for (const eventType of Object.values(AstronomicalEventType)) {
      try {
        const nextDate = await this.getNextEventDate(eventType)
        if (nextDate <= endDate) {
          events.push({
            type: eventType,
            date: nextDate,
            name: this.getEventDisplayName(eventType),
          })
        }
      } catch (error) {
        this.logger.warn(`Failed to calculate ${eventType}: ${error.message}`)
      }
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  private calculateNextFullMoon(fromDate: Date): Date {
    // Simplified lunar cycle calculation (29.53 days average)
    const lunarCycle = 29.53058867 // days
    const knownFullMoon = new Date("2024-01-25T17:54:00Z") // Known full moon

    const daysSinceKnown = (fromDate.getTime() - knownFullMoon.getTime()) / (1000 * 60 * 60 * 24)
    const cyclesSinceKnown = daysSinceKnown / lunarCycle
    const nextCycleNumber = Math.ceil(cyclesSinceKnown)

    const nextFullMoon = new Date(knownFullMoon.getTime() + nextCycleNumber * lunarCycle * 24 * 60 * 60 * 1000)
    return nextFullMoon
  }

  private calculateNextNewMoon(fromDate: Date): Date {
    // New moon occurs ~14.77 days before full moon
    const nextFullMoon = this.calculateNextFullMoon(fromDate)
    const newMoonOffset = 14.77 * 24 * 60 * 60 * 1000 // milliseconds

    let nextNewMoon = new Date(nextFullMoon.getTime() - newMoonOffset)

    // If calculated new moon is in the past, get the next one
    if (nextNewMoon <= fromDate) {
      const lunarCycle = 29.53058867 * 24 * 60 * 60 * 1000
      nextNewMoon = new Date(nextNewMoon.getTime() + lunarCycle)
    }

    return nextNewMoon
  }

  private calculateNextSummerSolstice(fromDate: Date): Date {
    const year = fromDate.getFullYear()
    let solstice = new Date(year, 5, 21, 0, 0, 0) // June 21st (approximate)

    if (solstice <= fromDate) {
      solstice = new Date(year + 1, 5, 21, 0, 0, 0)
    }

    return solstice
  }

  private calculateNextWinterSolstice(fromDate: Date): Date {
    const year = fromDate.getFullYear()
    let solstice = new Date(year, 11, 21, 0, 0, 0) // December 21st (approximate)

    if (solstice <= fromDate) {
      solstice = new Date(year + 1, 11, 21, 0, 0, 0)
    }

    return solstice
  }

  private calculateNextSpringEquinox(fromDate: Date): Date {
    const year = fromDate.getFullYear()
    let equinox = new Date(year, 2, 20, 0, 0, 0) // March 20th (approximate)

    if (equinox <= fromDate) {
      equinox = new Date(year + 1, 2, 20, 0, 0, 0)
    }

    return equinox
  }

  private calculateNextAutumnEquinox(fromDate: Date): Date {
    const year = fromDate.getFullYear()
    let equinox = new Date(year, 8, 22, 0, 0, 0) // September 22nd (approximate)

    if (equinox <= fromDate) {
      equinox = new Date(year + 1, 8, 22, 0, 0, 0)
    }

    return equinox
  }

  private async fetchFromNASAAPI(eventType: AstronomicalEventType): Promise<Date> {
    // This would integrate with NASA's API for complex events
    // For now, return a placeholder date
    this.logger.warn(`NASA API integration not implemented for ${eventType}`)
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + 6) // 6 months from now
    return futureDate
  }

  private getEventDisplayName(eventType: AstronomicalEventType): string {
    const displayNames = {
      [AstronomicalEventType.FULL_MOON]: "Full Moon",
      [AstronomicalEventType.NEW_MOON]: "New Moon",
      [AstronomicalEventType.SUMMER_SOLSTICE]: "Summer Solstice",
      [AstronomicalEventType.WINTER_SOLSTICE]: "Winter Solstice",
      [AstronomicalEventType.SPRING_EQUINOX]: "Spring Equinox",
      [AstronomicalEventType.AUTUMN_EQUINOX]: "Autumn Equinox",
      [AstronomicalEventType.LUNAR_ECLIPSE]: "Lunar Eclipse",
      [AstronomicalEventType.SOLAR_ECLIPSE]: "Solar Eclipse",
      [AstronomicalEventType.METEOR_SHOWER]: "Meteor Shower",
      [AstronomicalEventType.PLANETARY_ALIGNMENT]: "Planetary Alignment",
    }

    return displayNames[eventType] || eventType
  }
}
