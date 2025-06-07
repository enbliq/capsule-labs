import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets"
import type { Server, Socket } from "socket.io"
import { Logger } from "@nestjs/common"
import type { SyncAttemptDto, TimeServerResponseDto } from "./dto/timesync.dto"
import type { SyncValidatorService } from "./services/sync-validator.service"
import type { TimeServerService } from "./services/time-server.service"
import type { PulseBroadcasterService } from "./services/pulse-broadcaster.service"
import type { SyncPulse } from "./entities/timesync-capsule.entity"

@WebSocketGateway({
  namespace: "timesync-capsule",
  cors: {
    origin: "*", // In production, restrict this to your app's domain
  },
})
export class TimeSyncCapsuleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(TimeSyncCapsuleGateway.name)
  private readonly clientUsers = new Map<string, string>() // socketId -> userId

  constructor(
    private readonly syncValidatorService: SyncValidatorService,
    private readonly timeServerService: TimeServerService,
    private readonly pulseBroadcasterService: PulseBroadcasterService,
  ) {
    // Register for pulse broadcasts
    this.pulseBroadcasterService.registerPulseCallback((pulse: SyncPulse) => {
      this.broadcastPulseToClients(pulse)
    })
  }

  async handleConnection(client: Socket): Promise<void> {
    this.logger.log(`Client connected: ${client.id}`)
    this.pulseBroadcasterService.registerClient(client.id)
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.log(`Client disconnected: ${client.id}`)
    this.pulseBroadcasterService.unregisterClient(client.id)
    this.clientUsers.delete(client.id)
  }

  @SubscribeMessage("registerUser")
  async handleRegisterUser(
    client: Socket,
    @MessageBody() data: { userId: string },
  ): Promise<{ success: boolean; serverTime: TimeServerResponseDto }> {
    this.clientUsers.set(client.id, data.userId)

    // Send current server time for initial sync
    const serverTime = this.timeServerService.getCurrentTime()

    // Add next pulse info
    const nextPulseInfo = await this.pulseBroadcasterService.getNextPulseInfo()
    if (nextPulseInfo.nextPulse) {
      serverTime.nextPulse = {
        pulseId: "next-daily-pulse",
        scheduledTime: nextPulseInfo.nextPulse,
        countdown: nextPulseInfo.timeUntilPulse || 0,
      }
    }

    this.logger.log(`User ${data.userId} registered on socket ${client.id}`)

    return {
      success: true,
      serverTime,
    }
  }

  @SubscribeMessage("getServerTime")
  async handleGetServerTime(): Promise<TimeServerResponseDto> {
    return this.timeServerService.getCurrentTime()
  }

  @SubscribeMessage("ntpSync")
  async handleNTPSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { clientSentTime: string },
  ): Promise<{
    clientSentTime: string
    serverReceivedTime: string
    serverSentTime: string
  }> {
    const serverReceivedTime = new Date()
    const serverSentTime = new Date()

    const userId = this.clientUsers.get(client.id)
    if (userId) {
      // Log NTP sync attempt
      await this.syncValidatorService.logNTPSync(
        userId,
        new Date(data.clientSentTime),
        serverReceivedTime,
        serverSentTime,
        new Date(), // Client will fill this in
        {
          userAgent: client.handshake.headers["user-agent"],
          ipAddress: client.handshake.address,
        },
      )
    }

    return {
      clientSentTime: data.clientSentTime,
      serverReceivedTime: serverReceivedTime.toISOString(),
      serverSentTime: serverSentTime.toISOString(),
    }
  }

  @SubscribeMessage("syncAttempt")
  async handleSyncAttempt(@ConnectedSocket() client: Socket, @MessageBody() syncAttempt: SyncAttemptDto): Promise<any> {
    const userId = this.clientUsers.get(client.id)
    if (!userId) {
      return { error: "User not registered" }
    }

    try {
      const result = await this.syncValidatorService.processSyncAttempt(userId, syncAttempt)

      // If capsule was unlocked, broadcast to all clients
      if (result.capsuleUnlocked) {
        this.server.emit("capsuleUnlocked", {
          userId,
          timingAccuracy: result.timeDifference,
          timestamp: new Date(),
        })
      }

      return result
    } catch (error) {
      this.logger.error(`Error processing sync attempt for user ${userId}:`, error)
      return { error: "Failed to process sync attempt" }
    }
  }

  @SubscribeMessage("getActivePulse")
  async handleGetActivePulse(): Promise<SyncPulse | null> {
    return this.pulseBroadcasterService.getActivePulse()
  }

  @SubscribeMessage("getNextPulse")
  async handleGetNextPulse(): Promise<any> {
    return this.pulseBroadcasterService.getNextPulseInfo()
  }

  @SubscribeMessage("getUserHistory")
  async handleGetUserHistory(@ConnectedSocket() client: Socket, @MessageBody() data: { limit?: number }): Promise<any> {
    const userId = this.clientUsers.get(client.id)
    if (!userId) {
      return { error: "User not registered" }
    }

    return this.syncValidatorService.getUserSyncHistory(userId, data.limit)
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

    this.server.emit("syncPulse", pulseData)
    this.logger.log(`Broadcasted pulse ${pulse.id} to all connected clients`)
  }

  /**
   * Send countdown updates to clients
   */
  @SubscribeMessage("startCountdown")
  async handleStartCountdown(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetTime: string },
  ): Promise<{ success: boolean }> {
    const targetTime = new Date(data.targetTime)
    const now = this.timeServerService.getCurrentTime().serverTime

    const countdown = targetTime.getTime() - now.getTime()

    if (countdown > 0) {
      // Send countdown updates every second
      const interval = setInterval(() => {
        const currentTime = this.timeServerService.getCurrentTime().serverTime
        const remaining = targetTime.getTime() - currentTime.getTime()

        if (remaining <= 0) {
          clearInterval(interval)
          client.emit("countdownComplete", { targetTime })
        } else {
          client.emit("countdownUpdate", {
            remaining,
            targetTime,
            serverTime: currentTime,
          })
        }
      }, 1000)

      // Clean up interval after target time + 10 seconds
      setTimeout(() => {
        clearInterval(interval)
      }, countdown + 10000)
    }

    return { success: true }
  }
}
