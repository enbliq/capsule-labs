import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
} from "@nestjs/websockets"
import { Logger } from "@nestjs/common"
import type { Server, Socket } from "socket.io"
import type { CapsuleRouletteService } from "../services/capsule-roulette.service"

interface ConnectedUser {
  userId: string
  socket: Socket
  connectedAt: Date
  lastActivity: Date
}

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/roulette",
})
export class RouletteGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(RouletteGateway.name)
  private connectedUsers = new Map<string, ConnectedUser>()

  constructor(private readonly rouletteService: CapsuleRouletteService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket): void {
    // Find and remove user from connected users
    for (const [userId, user] of this.connectedUsers.entries()) {
      if (user.socket.id === client.id) {
        this.connectedUsers.delete(userId)
        this.logger.log(`User ${userId} disconnected`)
        break
      }
    }
  }

  @SubscribeMessage("join")
  handleJoin(data: { userId: string }, client: Socket): void {
    const { userId } = data

    // Store user connection
    this.connectedUsers.set(userId, {
      userId,
      socket: client,
      connectedAt: new Date(),
      lastActivity: new Date(),
    })

    // Join user to their personal room
    client.join(`user:${userId}`)

    // Send current roulette status
    this.sendRouletteStatus(userId)

    this.logger.log(`User ${userId} joined roulette room`)
  }

  @SubscribeMessage("get_status")
  handleGetStatus(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket): void {
    this.sendRouletteStatus(data.userId)
  }

  @SubscribeMessage("claim_attempt")
  async handleClaimAttempt(
    @MessageBody() data: { capsuleDropId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { capsuleDropId, userId } = data

    try {
      // Update user activity
      const user = this.connectedUsers.get(userId)
      if (user) {
        user.lastActivity = new Date()
      }

      // Attempt claim through service
      const result = await this.rouletteService.claimCapsule({
        capsuleDropId,
        userId,
        userAgent: client.handshake.headers["user-agent"],
        deviceFingerprint: this.generateDeviceFingerprint(client),
      })

      // Send result to user
      client.emit("claim_result", {
        success: result.success,
        message: result.message,
        rewardAmount: result.rewardAmount,
        transactionHash: result.transactionHash,
        claimEvent: result.claimEvent,
      })

      // If successful, notify all users that capsule was claimed
      if (result.success) {
        this.server.emit("capsule_claimed", {
          capsuleDropId,
          claimedBy: userId,
          claimedAt: new Date(),
          rewardAmount: result.rewardAmount,
        })
      }

      this.logger.log(`Claim attempt by ${userId} for ${capsuleDropId}: ${result.success ? "SUCCESS" : "FAILED"}`)
    } catch (error) {
      this.logger.error(`Error handling claim attempt:`, error)
      client.emit("claim_result", {
        success: false,
        message: "An error occurred while processing your claim",
      })
    }
  }

  @SubscribeMessage("subscribe_drops")
  handleSubscribeDrops(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket): void {
    const { userId } = data

    // Join drops notification room
    client.join("drop_notifications")

    this.logger.log(`User ${userId} subscribed to drop notifications`)
  }

  @SubscribeMessage("unsubscribe_drops")
  handleUnsubscribeDrops(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket): void {
    const { userId } = data

    // Leave drops notification room
    client.leave("drop_notifications")

    this.logger.log(`User ${userId} unsubscribed from drop notifications`)
  }

  // Method to broadcast drop notifications
  broadcastDropNotification(drop: any): void {
    this.server.to("drop_notifications").emit("new_drop", {
      dropId: drop.id,
      title: drop.title,
      description: drop.description,
      rewardAmount: drop.rewardConfig.baseAmount,
      currency: drop.rewardConfig.currency,
      expiresAt: drop.expiresAt,
      droppedAt: new Date(),
    })

    this.logger.log(`Broadcasted drop notification for ${drop.id} to all subscribers`)
  }

  // Method to send notifications to specific users
  notifyUsers(userIds: string[], event: string, data: any): void {
    for (const userId of userIds) {
      const user = this.connectedUsers.get(userId)
      if (user) {
        user.socket.emit(event, data)
      }
    }
  }

  // Method to get connected user count
  getConnectedUserCount(): number {
    return this.connectedUsers.size
  }

  // Method to get users in drop notification room
  getDropSubscriberCount(): number {
    const room = this.server.sockets.adapter.rooms.get("drop_notifications")
    return room ? room.size : 0
  }

  private async sendRouletteStatus(userId: string): Promise<void> {
    const user = this.connectedUsers.get(userId)
    if (!user) return

    try {
      // Get current active drops
      const activeDrops = this.rouletteService.getAllDrops({
        status: "dropped",
        limit: 10,
      })

      // Get user stats
      const userStats = this.rouletteService.getUserStats(userId)

      // Get next drop info
      // const nextDropInfo = await this.rouletteService.getNextDropInfo(userId)

      user.socket.emit("roulette_status", {
        activeDrops: activeDrops.map((drop) => ({
          id: drop.id,
          title: drop.title,
          description: drop.description,
          rewardAmount: drop.rewardConfig.baseAmount,
          currency: drop.rewardConfig.currency,
          expiresAt: drop.expiresAt,
          status: drop.status,
        })),
        userStats: {
          totalAttempts: userStats.totalAttempts,
          successfulClaims: userStats.successfulClaims,
          currentStreak: userStats.currentStreak,
          totalRewardsEarned: userStats.totalRewardsEarned,
          winRate: userStats.winRate,
        },
        connectedUsers: this.getConnectedUserCount(),
        dropSubscribers: this.getDropSubscriberCount(),
      })
    } catch (error) {
      this.logger.error(`Error sending roulette status to ${userId}:`, error)
    }
  }

  private generateDeviceFingerprint(client: Socket): string {
    const headers = client.handshake.headers
    const fingerprint = [
      headers["user-agent"] || "",
      headers["accept-language"] || "",
      headers["accept-encoding"] || "",
      client.handshake.address || "",
    ].join("|")

    // Simple hash function
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36)
  }
}
