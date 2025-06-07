import { Injectable, Logger } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { v4 as uuidv4 } from "uuid"
import type { SyncPulse, TimeSyncConfig } from "../entities/timesync-capsule.entity"
import type { TimeServerService } from "./time-server.service"
import type { NotificationService } from "./notification.service"

@Injectable()
export class PulseBroadcasterService {
  private readonly logger = new Logger(PulseBroadcasterService.name)
  private activePulse: SyncPulse | null = null
  private connectedClients = new Set<string>()
  private pulseCallbacks = new Set<(pulse: SyncPulse) => void>();

  constructor(
    @InjectRepository(SyncPulse)
    private readonly syncPulseRepository: Repository<SyncPulse>,
    @InjectRepository(TimeSyncConfig)
    private readonly configRepository: Repository<TimeSyncConfig>,
    private readonly timeServerService: TimeServerService,
    private readonly notificationService: NotificationService,
  ) { }

  /**
   * Daily pulse broadcast at 12:00 UTC
   */
  @Cron("0 0 12 * * *", { timeZone: "UTC" })
  async broadcastDailyPulse(): Promise<void> {
    const config = await this.getActiveConfig()

    if (!config.enableDailyPulses) {
      this.logger.log("Daily pulses are disabled")
      return
    }

    await this.createAndBroadcastPulse(new Date(), "Daily Sync Pulse", config.syncWindowMs, config.syncWindowMs)
  }

  /**
   * Create and broadcast a sync pulse
   */
  async createAndBroadcastPulse(
    scheduledTime: Date,
    description = "Sync Pulse",
    windowStartMs = 3000,
    windowEndMs = 3000,
  ): Promise<SyncPulse> {
    const pulseId = uuidv4()
    const actualBroadcastTime = this.timeServerService.getCurrentTime().serverTime

    // Create pulse record
    const pulse = this.syncPulseRepository.create({
      id: pulseId,
      scheduledTime,
      actualBroadcastTime,
      windowStartMs,
      windowEndMs,
      description,
      metadata: {
        broadcastDelay: actualBroadcastTime.getTime() - scheduledTime.getTime(),
        connectedClients: this.connectedClients.size,
        totalAttempts: 0,
        successfulAttempts: 0,
      },
    })

    await this.syncPulseRepository.save(pulse)

    // Set as active pulse
    this.activePulse = pulse

    // Broadcast to all connected clients
    this.broadcastPulseToClients(pulse)

    // Send notifications
    await this.notificationService.sendPulseBroadcastNotification(pulse.id, scheduledTime, windowStartMs + windowEndMs)

    this.logger.log(
      `Broadcasted sync pulse ${pulseId} at ${actualBroadcastTime.toISOString()} (scheduled: ${scheduledTime.toISOString()})`,
    )

    // Schedule pulse deactivation
    setTimeout(() => {
      this.deactivatePulse(pulseId)
    }, windowEndMs + 5000) // Give extra 5 seconds buffer

    return pulse
  }

  /**
   * Broadcast pulse to all connected clients
   */
  private broadcastPulseToClients(pulse: SyncPulse): void {
    const pulseData = {
      pulseId: pulse.id,
      scheduledTime: pulse.scheduledTime,
      actualBroadcastTime: pulse.actualBroadcastTime,
      windowStartMs: pulse.windowStartMs,
      windowEndMs: pulse.windowEndMs,
      description: pulse.description,
      serverTime: this.timeServerService.getCurrentTime().serverTime,
    }

    // Notify all registered callbacks (WebSocket gateway will register here)
    this.pulseCallbacks.forEach((callback) => {
      try {
        callback(pulse)
      } catch (error) {
        this.logger.error("Error in pulse callback:", error)
      }
    })

    this.logger.log(`Broadcasted pulse to ${this.connectedClients.size} connected clients`)
  }

  /**
   * Register a client connection
   */
  registerClient(clientId: string): void {
    this.connectedClients.add(clientId)
    this.logger.log(`Client ${clientId} registered. Total clients: ${this.connectedClients.size}`)
  }

  /**
   * Unregister a client connection
   */
  unregisterClient(clientId: string): void {
    this.connectedClients.delete(clientId)
    this.logger.log(`Client ${clientId} unregistered. Total clients: ${this.connectedClients.size}`)
  }

  /**
   * Register a callback for pulse broadcasts
   */
  registerPulseCallback(callback: (pulse: SyncPulse) => void): void {
    this.pulseCallbacks.add(callback)
  }

  /**
   * Unregister a pulse callback
   */
  unregisterPulseCallback(callback: (pulse: SyncPulse) => void): void {
    this.pulseCallbacks.delete(callback)
  }

  /**
   * Get the currently active pulse
   */
  getActivePulse(): SyncPulse | null {
    return this.activePulse
  }

  /**
   * Deactivate a pulse
   */
  private async deactivatePulse(pulseId: string): Promise<void> {
    if (this.activePulse && this.activePulse.id === pulseId) {
      this.activePulse.isActive = false
      await this.syncPulseRepository.save(this.activePulse)
      this.activePulse = null
      this.logger.log(`Deactivated pulse ${pulseId}`)
    }
  }

  /**
   * Schedule a custom pulse
   */
  async scheduleCustomPulse(scheduledTime: Date, description = "Custom Pulse", windowMs = 3000): Promise<SyncPulse> {
    const now = this.timeServerService.getCurrentTime().serverTime
    const delay = scheduledTime.getTime() - now.getTime()

    if (delay <= 0) {
      // Immediate pulse
      return this.createAndBroadcastPulse(scheduledTime, description, windowMs, windowMs)
    } else {
      // Schedule for later
      setTimeout(() => {
        this.createAndBroadcastPulse(scheduledTime, description, windowMs, windowMs)
      }, delay)

      // Create pending pulse record
      const pulse = this.syncPulseRepository.create({
        id: uuidv4(),
        scheduledTime,
        actualBroadcastTime: scheduledTime, // Will be updated when actually broadcast
        windowStartMs: windowMs,
        windowEndMs: windowMs,
        description,
        isActive: false, // Will be activated when broadcast
      })

      await this.syncPulseRepository.save(pulse)
      this.logger.log(`Scheduled custom pulse for ${scheduledTime.toISOString()}`)

      return pulse
    }
  }

  /**
   * Get next scheduled pulse info
   */
  async getNextPulseInfo(): Promise<{
    nextPulse: Date | null
    timeUntilPulse: number | null
    description: string | null
  }> {
    const config = await this.getActiveConfig()

    if (!config.enableDailyPulses) {
      return {
        nextPulse: null,
        timeUntilPulse: null,
        description: null,
      }
    }

    const { nextPulseTime, millisecondsUntil } = this.timeServerService.getTimeUntilNextPulse(config.dailyPulseTime)

    return {
      nextPulse: nextPulseTime,
      timeUntilPulse: millisecondsUntil,
      description: "Daily Sync Pulse",
    }
  }

  /**
   * Get pulse statistics
   */
  async getPulseStatistics(days = 7): Promise<{
    totalPulses: number
    averageDelay: number
    totalAttempts: number
    successfulAttempts: number
    successRate: number
  }> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const pulses = await this.syncPulseRepository.find({
      where: {
        createdAt: { $gte: startDate } as any,
      },
    })

    const totalPulses = pulses.length
    const totalDelay = pulses.reduce((sum, pulse) => {
      return sum + (pulse.metadata?.broadcastDelay || 0)
    }, 0)
    const averageDelay = totalPulses > 0 ? totalDelay / totalPulses : 0

    const totalAttempts = pulses.reduce((sum, pulse) => {
      return sum + (pulse.metadata?.totalAttempts || 0)
    }, 0)

    const successfulAttempts = pulses.reduce((sum, pulse) => {
      return sum + (pulse.metadata?.successfulAttempts || 0)
    }, 0)

    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0

    return {
      totalPulses,
      averageDelay,
      totalAttempts,
      successfulAttempts,
      successRate,
    }
  }

  /**
   * Update pulse statistics
   */
  async updatePulseStatistics(pulseId: string, wasSuccessful: boolean): Promise<void> {
    const pulse = await this.syncPulseRepository.findOne({
      where: { id: pulseId },
    })

    if (pulse) {
      pulse.metadata = pulse.metadata || {}
      pulse.metadata.totalAttempts = (pulse.metadata.totalAttempts || 0) + 1

      if (wasSuccessful) {
        pulse.metadata.successfulAttempts = (pulse.metadata.successfulAttempts || 0) + 1
      }

      await this.syncPulseRepository.save(pulse)
    }
  }

  /**
   * Get active configuration
   */
  private async getActiveConfig(): Promise<TimeSyncConfig> {
    const config = await this.configRepository.findOne({
      where: { isActive: true },
    })

    if (!config) {
      // Return default config
      return this.configRepository.create({
        dailyPulseTime: "12:00:00",
        pulseTimeZone: "UTC",
        syncWindowMs: 3000,
        maxNetworkLatency: 5000,
        enableNTPSync: true,
        enableDailyPulses: true,
        isActive: true,
        description: "Default TimeSync Configuration",
      })
    }

    return config
  }
}
