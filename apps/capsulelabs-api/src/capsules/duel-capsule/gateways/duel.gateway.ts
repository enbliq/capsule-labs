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
import type { DuelService } from "../services/duel.service"
import type { LeaderboardService } from "../services/leaderboard.service"
import { type Player, DuelStatus } from "../interfaces/duel.interface"
import type { JoinRoomDto, SubmitAnswerDto, ReadyDto } from "../dto/duel.dto"

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/duel",
})
@UsePipes(new ValidationPipe())
export class DuelGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(DuelGateway.name)
  private connectedPlayers = new Map<string, Player>()

  constructor(
    private readonly duelService: DuelService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)

    const player = this.connectedPlayers.get(client.id)
    if (player) {
      this.duelService.removePlayer(player.id)
      this.connectedPlayers.delete(client.id)

      // Notify other players in the room
      const room = this.duelService.getPlayerRoom(player.id)
      if (room) {
        this.server.to(room.id).emit("playerDisconnected", {
          playerId: player.id,
          roomId: room.id,
        })
      }
    }
  }

  @SubscribeMessage("registerPlayer")
  handleRegisterPlayer(client: Socket, data: { userId: string; username: string }) {
    const player: Player = {
      id: data.userId,
      socketId: client.id,
      username: data.username,
      isReady: false,
      score: 0,
    }

    this.connectedPlayers.set(client.id, player)

    client.emit("playerRegistered", {
      playerId: player.id,
      username: player.username,
    })

    this.logger.log(`Player registered: ${player.username} (${player.id})`)
  }

  @SubscribeMessage("challengePlayer")
  handleChallengePlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { challengedUserId: string; taskType?: string },
  ) {
    const challenger = this.connectedPlayers.get(client.id)
    if (!challenger) {
      client.emit("error", { message: "Player not registered" })
      return
    }

    // Find the challenged player
    const challengedPlayer = Array.from(this.connectedPlayers.values()).find((p) => p.id === data.challengedUserId)

    if (!challengedPlayer) {
      client.emit("error", { message: "Challenged player not found" })
      return
    }

    // Create duel room
    const room = this.duelService.createRoom(challenger, challengedPlayer)

    // Join both players to the room
    client.join(room.id)
    this.server.sockets.sockets.get(challengedPlayer.socketId)?.join(room.id)

    // Notify both players
    this.server.to(room.id).emit("challengeCreated", {
      roomId: room.id,
      challenger: challenger,
      challenged: challengedPlayer,
      taskType: data.taskType,
    })

    this.logger.log(`Challenge created: ${challenger.id} vs ${challengedPlayer.id}`)
  }

  @SubscribeMessage("joinRoom")
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: JoinRoomDto) {
    const player = this.connectedPlayers.get(client.id)
    if (!player) {
      client.emit("error", { message: "Player not registered" })
      return
    }

    const room = this.duelService.getRoom(data.roomId)
    if (!room) {
      client.emit("error", { message: "Room not found" })
      return
    }

    client.join(room.id)

    client.emit("roomJoined", {
      roomId: room.id,
      players: room.players,
      status: room.status,
    })
  }

  @SubscribeMessage("playerReady")
  handlePlayerReady(@ConnectedSocket() client: Socket, @MessageBody() data: ReadyDto) {
    const player = this.connectedPlayers.get(client.id)
    if (!player) {
      client.emit("error", { message: "Player not registered" })
      return
    }

    const room = this.duelService.setPlayerReady(data.roomId, player.id)
    if (!room) {
      client.emit("error", { message: "Room not found or player not in room" })
      return
    }

    // Notify all players in the room
    this.server.to(room.id).emit("playerReady", {
      playerId: player.id,
      roomStatus: room.status,
      players: room.players,
    })

    // If both players are ready, start the duel
    if (room.status === DuelStatus.READY) {
      this.startDuel(room.id)
    }
  }

  @SubscribeMessage("submitAnswer")
  handleSubmitAnswer(@ConnectedSocket() client: Socket, @MessageBody() data: SubmitAnswerDto) {
    const player = this.connectedPlayers.get(client.id)
    if (!player) {
      client.emit("error", { message: "Player not registered" })
      return
    }

    const result = this.duelService.submitAnswer(data.roomId, player.id, data.answer)

    if (result) {
      // Duel completed
      this.server.to(data.roomId).emit("duelCompleted", {
        result,
        winner: result.winner,
        loser: result.loser,
        capsuleReward: result.capsuleReward,
      })
    } else {
      // Wrong answer or other issue
      client.emit("answerResult", {
        correct: false,
        message: "Incorrect answer or already completed",
      })
    }
  }

  @SubscribeMessage('getLeaderboard')
  handleGetLeaderboard(@ConnectedSocket() client: Socket) {
    const leaderboard = this.leaderboardService.getLeaderboard(10);
    client.emit('leaderboard', leaderboard);
  }

  @SubscribeMessage("getPlayerStats")
  handleGetPlayerStats(@ConnectedSocket() client: Socket, @MessageBody() data: { playerId: string }) {
    const stats = this.leaderboardService.getPlayerStats(data.playerId)
    client.emit("playerStats", stats)
  }

  private async startDuel(roomId: string) {
    const room = await this.duelService.startDuel(roomId)
    if (room) {
      this.server.to(roomId).emit("duelStarted", {
        roomId,
        task: room.task,
        startTime: room.startedAt,
      })

      this.logger.log(`Duel started in room ${roomId}`)
    }
  }
}
