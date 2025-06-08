import { Injectable, Logger } from "@nestjs/common"

@Injectable()
export class TimeZoneService {
  private readonly logger = new Logger(TimeZoneService.name)

  // Comprehensive list of supported time zones
  private readonly supportedTimeZones = {
    // Africa
    "Africa/Lagos": "Nigeria (WAT)",
    "Africa/Cairo": "Egypt (EET)",
    "Africa/Johannesburg": "South Africa (SAST)",
    "Africa/Casablanca": "Morocco (WET)",
    "Africa/Nairobi": "Kenya (EAT)",

    // Asia
    "Asia/Kolkata": "India (IST)",
    "Asia/Tokyo": "Japan (JST)",
    "Asia/Shanghai": "China (CST)",
    "Asia/Dubai": "UAE (GST)",
    "Asia/Singapore": "Singapore (SGT)",
    "Asia/Seoul": "South Korea (KST)",
    "Asia/Bangkok": "Thailand (ICT)",
    "Asia/Jakarta": "Indonesia (WIB)",
    "Asia/Manila": "Philippines (PST)",
    "Asia/Karachi": "Pakistan (PKT)",

    // Europe
    "Europe/London": "United Kingdom (GMT/BST)",
    "Europe/Paris": "France (CET/CEST)",
    "Europe/Berlin": "Germany (CET/CEST)",
    "Europe/Rome": "Italy (CET/CEST)",
    "Europe/Madrid": "Spain (CET/CEST)",
    "Europe/Amsterdam": "Netherlands (CET/CEST)",
    "Europe/Stockholm": "Sweden (CET/CEST)",
    "Europe/Moscow": "Russia (MSK)",
    "Europe/Istanbul": "Turkey (TRT)",
    "Europe/Athens": "Greece (EET/EEST)",

    // North America
    "America/New_York": "US Eastern (EST/EDT)",
    "America/Chicago": "US Central (CST/CDT)",
    "America/Denver": "US Mountain (MST/MDT)",
    "America/Los_Angeles": "US Pacific (PST/PDT)",
    "America/Toronto": "Canada Eastern (EST/EDT)",
    "America/Vancouver": "Canada Pacific (PST/PDT)",
    "America/Mexico_City": "Mexico (CST/CDT)",

    // South America
    "America/Sao_Paulo": "Brazil (BRT)",
    "America/Argentina/Buenos_Aires": "Argentina (ART)",
    "America/Lima": "Peru (PET)",
    "America/Bogota": "Colombia (COT)",

    // Oceania
    "Australia/Sydney": "Australia Eastern (AEST/AEDT)",
    "Australia/Melbourne": "Australia Eastern (AEST/AEDT)",
    "Australia/Perth": "Australia Western (AWST)",
    "Pacific/Auckland": "New Zealand (NZST/NZDT)",

    // Middle East
    "Asia/Riyadh": "Saudi Arabia (AST)",
    "Asia/Tehran": "Iran (IRST)",
    "Asia/Jerusalem": "Israel (IST/IDT)",
  }

  getSupportedTimeZones(): Record<string, string> {
    return this.supportedTimeZones
  }

  validateTimeZone(timeZone: string): boolean {
    return timeZone in this.supportedTimeZones
  }

  getCurrentTimeInZone(timeZone: string): {
    currentTime: Date
    localHour: number
    localTimeString: string
    utcOffset: string
    isValid: boolean
  } {
    try {
      if (!this.validateTimeZone(timeZone)) {
        return {
          currentTime: new Date(),
          localHour: 0,
          localTimeString: "",
          utcOffset: "",
          isValid: false,
        }
      }

      const now = new Date()
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      })

      const parts = formatter.formatToParts(now)
      const hour = Number.parseInt(parts.find((part) => part.type === "hour")?.value || "0")
      const minute = parts.find((part) => part.type === "minute")?.value || "00"
      const second = parts.find((part) => part.type === "second")?.value || "00"
      const timeZoneName = parts.find((part) => part.type === "timeZoneName")?.value || ""

      const localTimeString = `${hour.toString().padStart(2, "0")}:${minute}:${second}`

      // Calculate UTC offset
      const utcDate1 = new Date(now.toISOString().slice(0, -1))
      const utcDate2 = new Date(now.toLocaleString("en-US", { timeZone }))
      const offsetMs = utcDate2.getTime() - utcDate1.getTime()
      const offsetHours = Math.floor(offsetMs / (1000 * 60 * 60))
      const offsetMinutes = Math.floor((offsetMs % (1000 * 60 * 60)) / (1000 * 60))
      const utcOffset = `${offsetHours >= 0 ? "+" : ""}${offsetHours.toString().padStart(2, "0")}:${Math.abs(offsetMinutes).toString().padStart(2, "0")}`

      return {
        currentTime: now,
        localHour: hour,
        localTimeString,
        utcOffset,
        isValid: true,
      }
    } catch (error) {
      this.logger.error(`Error getting time for timezone ${timeZone}:`, error)
      return {
        currentTime: new Date(),
        localHour: 0,
        localTimeString: "",
        utcOffset: "",
        isValid: false,
      }
    }
  }

  getTimeInMultipleZones(timeZones: string[]): Array<{
    timeZone: string
    label: string
    currentTime: Date
    localHour: number
    localTimeString: string
    utcOffset: string
    isValid: boolean
  }> {
    return timeZones.map((timeZone) => {
      const timeInfo = this.getCurrentTimeInZone(timeZone)
      return {
        timeZone,
        label: this.supportedTimeZones[timeZone] || timeZone,
        ...timeInfo,
      }
    })
  }

  checkSameHourAcrossZones(
    timeZones: string[],
    targetHour?: number,
  ): {
    allSameHour: boolean
    commonHour: number | null
    timeZoneDetails: Array<{
      timeZone: string
      localHour: number
      matches: boolean
    }>
  } {
    const timeDetails = this.getTimeInMultipleZones(timeZones)
    const validTimeDetails = timeDetails.filter((detail) => detail.isValid)

    if (validTimeDetails.length === 0) {
      return {
        allSameHour: false,
        commonHour: null,
        timeZoneDetails: [],
      }
    }

    // If target hour is specified, check against that
    if (targetHour !== undefined) {
      const timeZoneDetails = validTimeDetails.map((detail) => ({
        timeZone: detail.timeZone,
        localHour: detail.localHour,
        matches: detail.localHour === targetHour,
      }))

      const allMatch = timeZoneDetails.every((detail) => detail.matches)

      return {
        allSameHour: allMatch,
        commonHour: allMatch ? targetHour : null,
        timeZoneDetails,
      }
    }

    // Otherwise, check if all zones have the same current hour
    const firstHour = validTimeDetails[0].localHour
    const allSameHour = validTimeDetails.every((detail) => detail.localHour === firstHour)

    const timeZoneDetails = validTimeDetails.map((detail) => ({
      timeZone: detail.timeZone,
      localHour: detail.localHour,
      matches: detail.localHour === firstHour,
    }))

    return {
      allSameHour,
      commonHour: allSameHour ? firstHour : null,
      timeZoneDetails,
    }
  }

  getOptimalAccessTimes(
    timeZones: string[],
    targetHour: number,
  ): Array<{
    timeZone: string
    label: string
    nextAccessTime: Date
    hoursUntilAccess: number
    localTimeString: string
  }> {
    return timeZones.map((timeZone) => {
      const timeInfo = this.getCurrentTimeInZone(timeZone)
      const now = new Date()

      // Calculate next occurrence of target hour in this timezone
      const nextAccess = new Date(now)
      const currentHour = timeInfo.localHour

      if (currentHour < targetHour) {
        // Target hour is later today
        nextAccess.setHours(nextAccess.getHours() + (targetHour - currentHour))
      } else if (currentHour > targetHour) {
        // Target hour is tomorrow
        nextAccess.setHours(nextAccess.getHours() + (24 - currentHour + targetHour))
      }
      // If currentHour === targetHour, it's now!

      const hoursUntilAccess = Math.max(0, Math.floor((nextAccess.getTime() - now.getTime()) / (1000 * 60 * 60)))

      // Format the next access time in the target timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      })

      return {
        timeZone,
        label: this.supportedTimeZones[timeZone] || timeZone,
        nextAccessTime: nextAccess,
        hoursUntilAccess,
        localTimeString: formatter.format(nextAccess),
      }
    })
  }

  getTimeZoneGroups(): Record<string, string[]> {
    const groups: Record<string, string[]> = {
      Africa: [],
      Asia: [],
      Europe: [],
      "North America": [],
      "South America": [],
      Oceania: [],
    }

    Object.keys(this.supportedTimeZones).forEach((timeZone) => {
      if (timeZone.startsWith("Africa/")) {
        groups.Africa.push(timeZone)
      } else if (timeZone.startsWith("Asia/")) {
        groups.Asia.push(timeZone)
      } else if (timeZone.startsWith("Europe/")) {
        groups.Europe.push(timeZone)
      } else if (
        timeZone.startsWith("America/") &&
        !timeZone.includes("Argentina") &&
        !timeZone.includes("Sao_Paulo") &&
        !timeZone.includes("Lima") &&
        !timeZone.includes("Bogota")
      ) {
        groups["North America"].push(timeZone)
      } else if (timeZone.startsWith("America/")) {
        groups["South America"].push(timeZone)
      } else if (timeZone.startsWith("Australia/") || timeZone.startsWith("Pacific/")) {
        groups.Oceania.push(timeZone)
      }
    })

    return groups
  }
}
