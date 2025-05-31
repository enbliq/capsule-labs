import { Injectable, Logger } from "@nestjs/common"

export interface PlayerStats {
  playerId: string
  username: string
  wins: number
  losses: number
  totalDuels: number
  winRate: number
  averageTime: number
  capsules: string[]
  rank: number
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name)
  private playerStats = new Map<string, PlayerStats>()

  updatePlayerStats(playerId: string, won: boolean, duration: number): void {
    let stats = this.playerStats.get(playerId)

    if (!stats) {
      stats = {
        playerId,
        username: `Player_${playerId.substr(0, 8)}`,
        wins: 0,
        losses: 0,
        totalDuels: 0,
        winRate: 0,
        averageTime: 0,
        capsules: [],
        rank: 0,
      }
    }

    stats.totalDuels++
    if (won) {
      stats.wins++
      stats.capsules.push(this.generateCapsuleReward())
    } else {
      stats.losses++
    }

    stats.winRate = (stats.wins / stats.totalDuels) * 100
    stats.averageTime = (stats.averageTime * (stats.totalDuels - 1) + duration) / stats.totalDuels

    this.playerStats.set(playerId, stats)
    this.updateRankings()

    this.logger.log(`Updated stats for player ${playerId}: ${stats.wins}W/${stats.losses}L`)
  }

  getPlayerStats(playerId: string): PlayerStats | null {
    return this.playerStats.get(playerId) || null
  }

  getLeaderboard(limit = 10): PlayerStats[] {
    const allStats = Array.from(this.playerStats.values())
    return allStats
      .sort((a, b) => {
        // Sort by wins first, then by win rate, then by average time
        if (a.wins !== b.wins) return b.wins - a.wins
        if (a.winRate !== b.winRate) return b.winRate - a.winRate
        return a.averageTime - b.averageTime
      })
      .slice(0, limit)
  }

  private updateRankings(): void {
    const leaderboard = this.getLeaderboard(1000) // Get all players
    leaderboard.forEach((stats, index) => {
      stats.rank = index + 1
      this.playerStats.set(stats.playerId, stats)
    })
  }

  private generateCapsuleReward(): string {
    const rewards = ["Gold Capsule", "Silver Capsule", "Bronze Capsule", "Rare Capsule"]
    return rewards[Math.floor(Math.random() * rewards.length)]
  }
}
