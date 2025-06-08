import { Injectable } from "@nestjs/common"
import * as SunCalc from "suncalc"

export interface TwilightTimes {
  twilightStart: Date // Start of twilight (golden hour begin)
  twilightEnd: Date // End of twilight (dusk)
  nextTwilightStart: Date // Next day's twilight start
  nextTwilightEnd: Date // Next day's twilight end
}

@Injectable()
export class TwilightCalculationService {
  /**
   * Calculate twilight times for a specific location and date
   * Twilight is defined as the period between golden hour start and dusk
   */
  calculateTwilightTimes(latitude: number, longitude: number, date: Date = new Date()): TwilightTimes {
    // Get today's sun times
    const todaySunTimes = SunCalc.getTimes(date, latitude, longitude)

    // Golden hour start is when the soft light begins
    const twilightStart = todaySunTimes.goldenHour

    // Dusk is when the sun has completely set and darkness begins
    const twilightEnd = todaySunTimes.dusk

    // Calculate tomorrow's twilight times
    const tomorrow = new Date(date)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowSunTimes = SunCalc.getTimes(tomorrow, latitude, longitude)

    return {
      twilightStart,
      twilightEnd,
      nextTwilightStart: tomorrowSunTimes.goldenHour,
      nextTwilightEnd: tomorrowSunTimes.dusk,
    }
  }

  /**
   * Check if the current time is within twilight hours
   */
  isCurrentlyTwilight(latitude: number, longitude: number): boolean {
    const now = new Date()
    const { twilightStart, twilightEnd } = this.calculateTwilightTimes(latitude, longitude, now)

    return now >= twilightStart && now <= twilightEnd
  }

  /**
   * Get time remaining until next twilight period
   */
  getTimeUntilNextTwilight(
    latitude: number,
    longitude: number,
  ): {
    milliseconds: number
    formatted: string
  } {
    const now = new Date()
    const { twilightStart, twilightEnd, nextTwilightStart } = this.calculateTwilightTimes(latitude, longitude, now)

    let targetTime: Date

    // If we're before today's twilight, target is today's twilight start
    if (now < twilightStart) {
      targetTime = twilightStart
    }
    // If we're after today's twilight, target is tomorrow's twilight start
    else if (now > twilightEnd) {
      targetTime = nextTwilightStart
    }
    // We're currently in twilight, so time remaining is 0
    else {
      return { milliseconds: 0, formatted: "Currently in twilight" }
    }

    const milliseconds = targetTime.getTime() - now.getTime()

    // Format the time difference
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))

    return {
      milliseconds,
      formatted: `${hours} hours and ${minutes} minutes`,
    }
  }
}
