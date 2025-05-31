import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketServer,
} from "@nestjs/websockets"
import type { Server, Socket } from "socket.io"
import { Logger, UsePipes, ValidationPipe } from "@nestjs/common"
import type { ProximityCapsuleService } from "../services/proximity-capsule.service"
import type { JoinGroupDto, ProximityCheckDto } from "../dto/proximity-capsule.dto"

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/proximity",
})
@UsePipes(new ValidationPipe())
export class ProximityGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(ProximityGateway.name)
  private connectedUsers = new Map<string, { userId: string; deviceId: string; socketId: string }>()

  constructor(private readonly proximityCapsuleService: ProximityCapsuleService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)

    // Find and remove user
    for (const [key, user] of this.connectedUsers.entries()) {
      if (user.socketId === client.id) {
        this.connectedUsers.delete(key)

        // Notify group members about disconnection
        this.notifyGroupMembersOfDisconnection(user.userId, user.deviceId)
        break
      }
    }
  }

  @SubscribeMessage("registerUser")
  handleRegisterUser(client: Socket, data: { userId: string; deviceId: string }) {
    const userKey = `${data.userId}_${data.deviceId}`
    this.connectedUsers.set(userKey, {
      userId: data.userId,
      deviceId: data.deviceId,
      socketId: client.id,
    })

    client.emit("userRegistered", {
      userId: data.userId,
      deviceId: data.deviceId,
      timestamp: new Date().toISOString(),
    })

    this.logger.log(`User registered: ${data.userId} with device ${data.deviceId}`)
  }

  @SubscribeMessage("joinGroup")
  async handleJoinGroup(client: Socket, @MessageBody() joinDto: JoinGroupDto) {
    try {
      const result = await this.proximityCapsuleService.joinGroup(joinDto)

      client.emit("joinGroupResult", {
        success: result.success,
        message: result.message,
        group: result.group,
        missingMembers: result.missingMembers,
        proximityIssues: result.proximityIssues,
      })

      // If successful, join socket room and notify other members
      if (result.success && result.group) {
        const roomName = `group_${result.group.id}`
        client.join(roomName)

        // Notify other group members
        client.to(roomName).emit("memberJoined", {
          userId: joinDto.userId,
          deviceId: joinDto.deviceId,
          memberCount: result.group.members.length,
          missingMembers: result.missingMembers,
        })

        this.logger.log(`User ${joinDto.userId} joined group ${result.group.id}`)
      }
    } catch (error) {
      client.emit("joinGroupResult", {
        success: false,
        message: error instanceof Error ? error.message : "Failed to join group",
      })
    }
  }

  @SubscribeMessage("proximityCheck")
  async handleProximityCheck(@ConnectedSocket() client: Socket, @MessageBody() checkDto: ProximityCheckDto) {
    try {
      const result = await this.proximityCapsuleService.submitProximityCheck(checkDto)

      client.emit("proximityCheckResult", {
        isValid: result.isValid,
        confidence: result.confidence,
        detectedMethods: result.detectedMethods,
        estimatedDistance: result.estimatedDistance,
        reliability: result.reliability,
        errors: result.errors,
        warnings: result.warnings,
      })

      // Notify group members about proximity update
      const group = this.proximityCapsuleService.getGroupById(checkDto.groupId)
      if (group) {
        const roomName = `group_${group.id}`
        client.to(roomName).emit("memberProximityUpdate", {
          userId: checkDto.userId,
          deviceId: checkDto.deviceId,
          isValid: result.isValid,
          confidence: result.confidence,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      client.emit("proximityCheckResult", {
        isValid: false,
        confidence: 0,
        errors: [error instanceof Error ? error.message : "Proximity check failed"],
      })
    }
  }

  @SubscribeMessage("getGroupStatus")
  handleGetGroupStatus(@ConnectedSocket() client: Socket, @MessageBody() data: { capsuleId: string }) {
    try {
      const group = this.proximityCapsuleService.getActiveGroup(data.capsuleId)

      if (group) {
        client.emit("groupStatus", {
          groupId: group.id,
          status: group.status,
          memberCount: group.members.length,
          members: group.members.map((member) => ({
            userId: member.userId,
            deviceId: member.deviceId,
            joinedAt: member.joinedAt,
            lastSeen: member.lastSeen,
            isAuthenticated: member.isAuthenticated,
          })),
          expiresAt: group.expiresAt,
        })
      } else {
        client.emit("groupStatus", {
          groupId: null,
          status: "not_found",
          message: "No active group found for this capsule",
        })
      }
    } catch (error) {
      client.emit("groupStatus", {
        error: error instanceof Error ? error.message : "Failed to get group status",
      })
    }
  }

  @SubscribeMessage("leaveGroup")
  handleLeaveGroup(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: string; userId: string }) {
    try {
      const group = this.proximityCapsuleService.getGroupById(data.groupId)

      if (group) {
        const roomName = `group_${group.id}`
        client.leave(roomName)

        // Notify other group members
        client.to(roomName).emit("memberLeft", {
          userId: data.userId,
          memberCount: group.members.length - 1,
        })

        client.emit("leftGroup", {
          success: true,
          groupId: data.groupId,
        })

        this.logger.log(`User ${data.userId} left group ${data.groupId}`)
      }
    } catch (error) {
      client.emit("leftGroup", {
        success: false,
        error: error instanceof Error ? error.message : "Failed to leave group",
      })
    }
  }

  private notifyGroupMembersOfDisconnection(userId: string, deviceId: string) {
    // Find all groups this user might be in and notify members
    // This is a simplified implementation - in production you'd track user-group relationships
    this.server.emit("memberDisconnected", {
      userId,
      deviceId,
      timestamp: new Date().toISOString(),
    })
  }

  // Periodic group health check
  @SubscribeMessage("requestGroupHealth")
  handleRequestGroupHealth(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: string }) {
    try {
      const group = this.proximityCapsuleService.getGroupById(data.groupId)

      if (group) {
        // This would use the group management service to get health metrics
        const health = {
          groupId: group.id,
          memberCount: group.members.length,
          activeMembers: group.members.filter((m) => Date.now() - m.lastSeen.getTime() < 60000).length,
          recentChecks: group.proximityChecks.filter((c) => Date.now() - c.timestamp.getTime() < 60000).length,
          status: group.status,
        }

        client.emit("groupHealth", health)
      }
    } catch (error) {
      client.emit("groupHealth", {
        error: error instanceof Error ? error.message : "Failed to get group health",
      })
    }
  }
}
