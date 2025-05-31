import { Test, type TestingModule } from "@nestjs/testing"
import { DuelGateway } from "../gateways/duel.gateway"
import { DuelService } from "../services/duel.service"
import { LeaderboardService } from "../services/leaderboard.service"
import { TaskService } from "../services/task.service"

describe("DuelGateway", () => {
  let gateway: DuelGateway
  let duelService: DuelService
  let leaderboardService: LeaderboardService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuelGateway,
        {
          provide: DuelService,
          useValue: {
            createRoom: jest.fn(),
            setPlayerReady: jest.fn(),
            startDuel: jest.fn(),
            submitAnswer: jest.fn(),
            removePlayer: jest.fn(),
            getRoom: jest.fn(),
            getPlayerRoom: jest.fn(),
          },
        },
        {
          provide: LeaderboardService,
          useValue: {
            getLeaderboard: jest.fn(),
            getPlayerStats: jest.fn(),
          },
        },
        TaskService,
      ],
    }).compile()

    gateway = module.get<DuelGateway>(DuelGateway)
    duelService = module.get<DuelService>(DuelService)
    leaderboardService = module.get<LeaderboardService>(LeaderboardService)
  })

  it("should be defined", () => {
    expect(gateway).toBeDefined()
  })

  describe("handleConnection", () => {
    it("should log client connection", () => {
      const mockClient = { id: "test-socket-id" } as any
      const logSpy = jest.spyOn(gateway["logger"], "log")

      gateway.handleConnection(mockClient)

      expect(logSpy).toHaveBeenCalledWith("Client connected: test-socket-id")
    })
  })

  describe("handleRegisterPlayer", () => {
    it("should register a player and emit confirmation", () => {
      const mockClient = {
        id: "socket-id",
        emit: jest.fn(),
      } as any

      const playerData = {
        userId: "user-123",
        username: "TestPlayer",
      }

      gateway.handleRegisterPlayer(mockClient, playerData)

      expect(mockClient.emit).toHaveBeenCalledWith("playerRegistered", {
        playerId: "user-123",
        username: "TestPlayer",
      })
    })
  })
})
