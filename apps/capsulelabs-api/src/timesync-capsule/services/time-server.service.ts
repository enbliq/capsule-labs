import { Injectable, Logger } from "@nestjs/common"
import type { TimeServerResponseDto, NTPSyncDto } from "../dto/timesync.dto"

@Injectable()
export class TimeServerService {
  private readonly logger = new Logger(TimeServerService.name)
  private ntpOffset = 0 // Current NTP offset in milliseconds
  private lastNTPSync: Date | null = null

  /**
   * Get current server time with NTP correction
   */
  getCurrentTime(): TimeServerResponseDto {
    const now = new Date()
    const correctedTime = new Date(now.getTime() + this.ntpOffset)

    return {
      serverTime: correctedTime,
      utcTime: new Date(correctedTime.toISOString()),
      timestamp: correctedTime.getTime(),
      ntpOffset: this.ntpOffset,
      timeZone: "UTC",
    }
  }

  /**
   * Perform NTP-style time synchronization
   */
  async performNTPSync(clientSentTime: Date, serverReceivedTime: Date): Promise<NTPSyncDto> {
    const serverSentTime = new Date()

    // This would be filled by the client when they receive the response
    const clientReceivedTime = new Date() // Placeholder - actual value comes from client

    // Calculate round-trip time and clock offset
    const roundTripTime = clientReceivedTime.getTime() - clientSentTime.getTime()
    const clockOffset =
      (serverReceivedTime.getTime() -
        clientSentTime.getTime() +
        serverSentTime.getTime() -
        clientReceivedTime.getTime()) /
      2

    // Update our NTP offset
    this.ntpOffset = clockOffset
    this.lastNTPSync = new Date()

    this.logger.log(`NTP sync completed. Offset: ${clockOffset}ms, RTT: ${roundTripTime}ms`)

    return {
      clientSentTime,
      serverReceivedTime,
      serverSentTime,
      clientReceivedTime,
      roundTripTime,
      clockOffset,
    }
  }

  /**
   * Calculate network latency compensation
   */
  calculateNetworkLatency(clientTimestamp: Date, serverTimestamp: Date): number {
    return Math.abs(serverTimestamp.getTime() - clientTimestamp.getTime())
  }

  /**
   * Get time until next scheduled pulse
   */
  getTimeUntilNextPulse(pulseTime = "12:00:00"): {
    nextPulseTime: Date
    millisecondsUntil: number
  } {
    const now = this.getCurrentTime().serverTime
    const today = new Date(now)
    today.setUTCHours(0, 0, 0, 0)

    // Parse pulse time (HH:MM:SS)
    const [hours, minutes, seconds] = pulseTime.split(":").map(Number)

    const nextPulse = new Date(today)
    nextPulse.setUTCHours(hours, minutes, seconds, 0)

    // If today's pulse has passed, schedule for tomorrow
    if (nextPulse <= now) {
      nextPulse.setUTCDate(nextPulse.getUTCDate() + 1)
    }

    const millisecondsUntil = nextPulse.getTime() - now.getTime()

    return {
      nextPulseTime: nextPulse,
      millisecondsUntil,
    }
  }

  /**
   * Validate if a sync attempt is within the allowed window
   */
  validateSyncTiming(
    clientTimestamp: Date,
    serverTimestamp: Date,
    pulseScheduledTime: Date,
    windowMs = 3000,
    networkLatency = 0,
  ): {
    timeDifference: number
    withinWindow: boolean
    adjustedDifference: number
  } {
    // Calculate the difference between client action and scheduled pulse
    const rawDifference = Math.abs(clientTimestamp.getTime() - pulseScheduledTime.getTime())

    // Adjust for network latency (give benefit of the doubt)
    const adjustedDifference = Math.max(0, rawDifference - networkLatency / 2)

    // Check if within allowed window
    const withinWindow = adjustedDifference <= windowMs

    this.logger.debug(
      `Sync validation: Raw diff: ${rawDifference}ms, Adjusted: ${adjustedDifference}ms, Window: ${windowMs}ms, Valid: ${withinWindow}`,
    )

    return {
      timeDifference: rawDifference,
      withinWindow,
      adjustedDifference,
    }
  }

  /**
   * Get current NTP status
   */
  getNTPStatus(): {
    isNTPSynced: boolean
    ntpOffset: number
    lastSyncTime: Date | null
    timeSinceLastSync: number | null
  } {
    const timeSinceLastSync = this.lastNTPSync ? Date.now() - this.lastNTPSync.getTime() : null

    return {
      isNTPSynced: this.lastNTPSync !== null,
      ntpOffset: this.ntpOffset,
      lastSyncTime: this.lastNTPSync,
      timeSinceLastSync,
    }
  }

  /**
   * Reset NTP synchronization
   */
  resetNTPSync(): void {
    this.ntpOffset = 0
    this.lastNTPSync = null
    this.logger.log("NTP synchronization reset")
  }

  /**
   * Get high-precision timestamp
   */
  getHighPrecisionTimestamp(): {
    timestamp: number
    microseconds: number
    nanoseconds: number
  } {
    const now = Date.now()

    // Use performance.now() for higher precision if available
    const performanceNow = typeof performance !== "undefined" ? performance.now() : 0

    return {
      timestamp: now,
      microseconds: Math.floor((performanceNow % 1) * 1000),
      nanoseconds: Math.floor(((performanceNow * 1000) % 1) * 1000),
    }
  }

  /**
   * Calculate time drift over a period
   */
  calculateTimeDrift(startTime: Date, endTime: Date, expectedDuration: number): number {
    const actualDuration = endTime.getTime() - startTime.getTime()
    return actualDuration - expectedDuration
  }
}
