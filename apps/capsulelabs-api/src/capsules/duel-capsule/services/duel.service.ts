import { Injectable, Logger } from "@nestjs/common"
import { type DuelRoom, type Player, DuelStatus, type TaskType, type DuelResult } from "../interfaces/duel.interface"
import type { TaskService } from "./task.service"
import type { LeaderboardService } from "./leaderboard.service"

@Injectable()
export class DuelService {
  private readonly logger = new Logger(DuelService.name)
  private rooms = new Map<string, DuelRoom>()
  private playerRooms = new Map<string, string>() // playerId -> roomId

  constructor(
    private readonly taskService: TaskService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  createRoom(player1: Player, player2: Player): DuelRoom {
    const roomId = this.generateRoomId()
    const room: DuelRoom = {
      id: roomId,
      players: [player1, player2],
      status: DuelStatus.WAITING,
      createdAt: new Date(),
    }

    this.rooms.set(roomId, room)
    this.playerRooms.set(player1.id, roomId)
    this.playerRooms.set(player2.id, roomId)

    this.logger.log(`Created duel room ${roomId} for players ${player1.id} and ${player2.id}`)
    return room
  }

  joinRoom(roomId: string, player: Player): DuelRoom | null {
    const room = this.rooms.get(roomId)
    if (!room || room.players.length >= 2) {
      return null
    }

    room.players.push(player)
    this.playerRooms.set(player.id, roomId)

    this.logger.log(`Player ${player.id} joined room ${roomId}`)
    return room
  }

  setPlayerReady(roomId: string, playerId: string): DuelRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const player = room.players.find((p) => p.id === playerId)
    if (!player) return null

    player.isReady = true

    // Check if both players are ready
    if (room.players.every((p) => p.isReady)) {
      room.status = DuelStatus.READY
    }

    return room
  }

  async startDuel(roomId: string, taskType?: TaskType): Promise<DuelRoom | null> {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== DuelStatus.READY) {
      return null
    }

    // Generate task
    const task = await this.taskService.generateTask(taskType)
    room.task = task
    room.status = DuelStatus.IN_PROGRESS
    room.startedAt = new Date()

    // Set timeout for the duel
    room.timeoutId = setTimeout(() => {
      this.handleDuelTimeout(roomId)
    }, task.timeLimit * 1000)

    this.logger.log(`Started duel in room ${roomId} with task type ${task.type}`)
    return room
  }

  submitAnswer(roomId: string, playerId: string, answer: string): DuelResult | null {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== DuelStatus.IN_PROGRESS) {
      return null
    }

    const player = room.players.find((p) => p.id === playerId)
    if (!player || player.completedAt) {
      return null
    }

    const isCorrect = this.taskService.validateAnswer(room.task, answer)
    if (!isCorrect) {
      return null
    }

    player.completedAt = new Date()
    player.score = this.calculateScore(room.startedAt, player.completedAt)

    // Check if this is the first correct answer (winner)
    const completedPlayers = room.players.filter((p) => p.completedAt)
    if (completedPlayers.length === 1) {
      return this.completeDuel(roomId, player)
    }

    return null
  }

  private completeDuel(roomId: string, winner: Player): DuelResult {
    const room = this.rooms.get(roomId)
    room.status = DuelStatus.COMPLETED
    room.endedAt = new Date()
    room.winner = winner

    // Clear timeout
    if (room.timeoutId) {
      clearTimeout(room.timeoutId)
    }

    const loser = room.players.find((p) => p.id !== winner.id)
    const duration = room.endedAt.getTime() - room.startedAt.getTime()
    const capsuleReward = this.generateCapsuleReward()

    const result: DuelResult = {
      roomId,
      winner,
      loser,
      task: room.task,
      duration,
      capsuleReward,
    }

    // Update leaderboard
    this.leaderboardService.updatePlayerStats(winner.id, true, duration)
    this.leaderboardService.updatePlayerStats(loser.id, false, duration)

    this.logger.log(`Duel completed in room ${roomId}. Winner: ${winner.id}`)
    return result
  }

  private handleDuelTimeout(roomId: string): void {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== DuelStatus.IN_PROGRESS) {
      return
    }

    room.status = DuelStatus.CANCELLED
    room.endedAt = new Date()

    this.logger.log(`Duel timed out in room ${roomId}`)
  }

  removePlayer(playerId: string): void {
    const roomId = this.playerRooms.get(playerId)
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (!room) return

    // Remove player from room
    room.players = room.players.filter((p) => p.id !== playerId)
    this.playerRooms.delete(playerId)

    // Cancel room if no players left or in progress
    if (room.players.length === 0 || room.status === DuelStatus.IN_PROGRESS) {
      room.status = DuelStatus.CANCELLED
      if (room.timeoutId) {
        clearTimeout(room.timeoutId)
      }
    }

    this.logger.log(`Player ${playerId} removed from room ${roomId}`)
  }

  getRoom(roomId: string): DuelRoom | null {
    return this.rooms.get(roomId) || null
  }

  getPlayerRoom(playerId: string): DuelRoom | null {
    const roomId = this.playerRooms.get(playerId)
    return roomId ? this.rooms.get(roomId) || null : null
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private calculateScore(startTime: Date, endTime: Date): number {
    const duration = endTime.getTime() - startTime.getTime()
    return Math.max(1000 - duration, 100) // Higher score for faster completion
  }

  private generateCapsuleReward(): string {
    const rewards = ["Gold Capsule", "Silver Capsule", "Bronze Capsule", "Rare Capsule"]
    return rewards[Math.floor(Math.random() * rewards.length)]
  }
}
