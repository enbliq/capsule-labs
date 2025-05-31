import { Test, type TestingModule } from "@nestjs/testing"
import { DuelService } from "../services/duel.service"
import { TaskService } from "../services/task.service"
import { LeaderboardService } from "../services/leaderboard.service"
import { type Player, DuelStatus, TaskType } from "../interfaces/duel.interface"

describe("DuelService", () => {
  let service: DuelService
  let taskService: TaskService
  let leaderboardService: LeaderboardService

  const mockPlayer1: Player = {
    id: "player1",
    socketId: "socket1",
    username: "Player1",
    isReady: false,
    score: 0,
  }

  const mockPlayer2: Player = {
    id: "player2",
    socketId: "socket2",
    username: "Player2",
    isReady: false,
    score: 0,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DuelService, TaskService, LeaderboardService],
    }).compile()

    service = module.get<DuelService>(DuelService)
    taskService = module.get<TaskService>(TaskService)
    leaderboardService = module.get<LeaderboardService>(LeaderboardService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createRoom", () => {
    it("should create a new duel room with two players", () => {
      const room = service.createRoom(mockPlayer1, mockPlayer2)

      expect(room).toBeDefined()
      expect(room.players).toHaveLength(2)
      expect(room.status).toBe(DuelStatus.WAITING)
      expect(room.players).toContain(mockPlayer1)
      expect(room.players).toContain(mockPlayer2)
    })
  })

  describe("setPlayerReady", () => {
    it("should set player as ready and update room status when both players are ready", () => {
      const room = service.createRoom(mockPlayer1, mockPlayer2)

      // Set first player ready
      let updatedRoom = service.setPlayerReady(room.id, mockPlayer1.id)
      expect(updatedRoom.players[0].isReady).toBe(true)
      expect(updatedRoom.status).toBe(DuelStatus.WAITING)

      // Set second player ready
      updatedRoom = service.setPlayerReady(room.id, mockPlayer2.id)
      expect(updatedRoom.players[1].isReady).toBe(true)
      expect(updatedRoom.status).toBe(DuelStatus.READY)
    })
  })

  describe("startDuel", () => {
    it("should start a duel when room is ready", async () => {
      const room = service.createRoom(mockPlayer1, mockPlayer2)
      service.setPlayerReady(room.id, mockPlayer1.id)
      service.setPlayerReady(room.id, mockPlayer2.id)

      const startedRoom = await service.startDuel(room.id, TaskType.MATH)

      expect(startedRoom.status).toBe(DuelStatus.IN_PROGRESS)
      expect(startedRoom.task).toBeDefined()
      expect(startedRoom.startedAt).toBeDefined()
    })

    it("should not start a duel when room is not ready", async () => {
      const room = service.createRoom(mockPlayer1, mockPlayer2)

      const result = await service.startDuel(room.id, TaskType.MATH)

      expect(result).toBeNull()
    })
  })

  describe("submitAnswer", () => {
    it("should complete duel when correct answer is submitted", async () => {
      const room = service.createRoom(mockPlayer1, mockPlayer2)
      service.setPlayerReady(room.id, mockPlayer1.id)
      service.setPlayerReady(room.id, mockPlayer2.id)
      await service.startDuel(room.id, TaskType.MATH)

      // Mock the task service to return true for validation
      jest.spyOn(taskService, "validateAnswer").mockReturnValue(true)

      const result = service.submitAnswer(room.id, mockPlayer1.id, "correct_answer")

      expect(result).toBeDefined()
      expect(result.winner.id).toBe(mockPlayer1.id)
      expect(result.loser.id).toBe(mockPlayer2.id)
    })

    it("should return null for incorrect answer", async () => {
      const room = service.createRoom(mockPlayer1, mockPlayer2)
      service.setPlayerReady(room.id, mockPlayer1.id)
      service.setPlayerReady(room.id, mockPlayer2.id)
      await service.startDuel(room.id, TaskType.MATH)

      // Mock the task service to return false for validation
      jest.spyOn(taskService, "validateAnswer").mockReturnValue(false)

      const result = service.submitAnswer(room.id, mockPlayer1.id, "wrong_answer")

      expect(result).toBeNull()
    })
  })

  describe("removePlayer", () => {
    it("should remove player from room and cancel if in progress", () => {
      const room = service.createRoom(mockPlayer1, mockPlayer2)
      service.setPlayerReady(room.id, mockPlayer1.id)
      service.setPlayerReady(room.id, mockPlayer2.id)

      service.removePlayer(mockPlayer1.id)

      const updatedRoom = service.getRoom(room.id)
      expect(updatedRoom.players).toHaveLength(1)
      expect(updatedRoom.players[0].id).toBe(mockPlayer2.id)
    })
  })
})
