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
import type { OrientationDataDto, FlipStatusDto } from "./dto/orientation.dto"
import type { FlipSessionService } from "./services/flip-session.service"
import type { OrientationValidatorService } from "./services/orientation-validator.service"
import type { NotificationService } from "./services/notification.service"

@WebSocketGateway({
  namespace: "flip-capsule",
  cors: {
    origin: "*", // In production, restrict this to your app's domain
  },
})
export class FlipCapsuleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(FlipCapsuleGateway.name)
  private readonly clientSessions = new Map<string, string>() // socketId -> sessionId

  constructor(
    private readonly flipSessionService: FlipSessionService,
    private readonly orientationValidator: OrientationValidatorService,
    private readonly notificationService: NotificationService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    this.logger.log(`Client connected: ${client.id}`)
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.log(`Client disconnected: ${client.id}`)

    // End session if client had one
    const sessionId = this.clientSessions.get(client.id)
    if (sessionId) {
      await this.flipSessionService.endSession(sessionId)
      this.clientSessions.delete(client.id)
    }
  }

  @SubscribeMessage("startSession")
  async handleStartSession(
    client: Socket,
    @MessageBody() data: { userId: string; deviceInfo: Record<string, any> },
  ): Promise<{ sessionId: string; requiredDuration: number }> {
    this.logger.log(`Starting session for user ${data.userId}`)

    // End any existing session for this client
    const existingSessionId = this.clientSessions.get(client.id)
    if (existingSessionId) {
      await this.flipSessionService.endSession(existingSessionId)
    }

    // Start new session
    const session = await this.flipSessionService.startSession(data.userId, data.deviceInfo)

    // Associate client with session
    this.clientSessions.set(client.id, session.sessionId)

    // Send notification
    await this.notificationService.sendSessionStartedNotification(
      data.userId,
      session.sessionId,
      session.requiredDuration,
    )

    return session
  }

  @SubscribeMessage("orientationUpdate")
  async handleOrientationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() orientation: OrientationDataDto,
  ): Promise<FlipStatusDto | null> {
    const sessionId = this.clientSessions.get(client.id)
    if (!sessionId) {
      return null
    }

    // Process orientation update
    const status = await this.flipSessionService.processOrientationUpdate(sessionId, orientation)

    // If session is complete, notify client
    if (status?.isComplete) {
      client.emit("sessionComplete", { sessionId, completedAt: new Date() })
    }

    return status
  }

  @SubscribeMessage("endSession")
  async handleEndSession(@ConnectedSocket() client: Socket): Promise<{ success: boolean }> {
    const sessionId = this.clientSessions.get(client.id)
    if (!sessionId) {
      return { success: false }
    }

    await this.flipSessionService.endSession(sessionId)
    this.clientSessions.delete(client.id)

    return { success: true }
  }

  @SubscribeMessage("checkDeviceCapabilities")
  async handleCheckDeviceCapabilities(
    @ConnectedSocket() client: Socket,
    @MessageBody() orientation: OrientationDataDto,
  ): Promise<{
    hasRequiredSensors: boolean
    missingFeatures: string[]
    deviceOrientation: string
  }> {
    const capabilities = this.orientationValidator.validateDeviceCapabilities(orientation)
    const deviceOrientation = this.orientationValidator.getDeviceOrientationMode(orientation)

    return {
      ...capabilities,
      deviceOrientation,
    }
  }

  @SubscribeMessage("getSessionStatus")
  async handleGetSessionStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): Promise<any> {
    return this.flipSessionService.getSessionStatus(data.sessionId)
  }
}
