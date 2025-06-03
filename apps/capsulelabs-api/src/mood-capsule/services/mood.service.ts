import { Injectable, Logger } from "@nestjs/common"
import { type Repository, Between } from "typeorm"
import type { MoodEntry } from "../entities/mood-entry.entity"
import type { SentimentService } from "./sentiment.service"
import type { CreateMoodEntryDto } from "../dto/create-mood-entry.dto"
import type { GetMoodHistoryDto } from "../dto/mood-history.dto"

export interface MoodConsistencyResult {
  isConsistent: boolean
  consistencyScore: number
  daysCovered: number
  averageSentiment: number
  sentimentVariance: number
}

@Injectable()
export class MoodService {
  private readonly logger = new Logger(MoodService.name)

  constructor(
    private readonly moodEntryRepository: Repository<MoodEntry>,
    private readonly sentimentService: SentimentService,
  ) {}

  async createMoodEntry(createMoodEntryDto: CreateMoodEntryDto): Promise<MoodEntry> {
    const sentimentResult = await this.sentimentService.analyzeSentiment(createMoodEntryDto.content)

    const moodEntry = this.moodEntryRepository.create({
      ...createMoodEntryDto,
      sentimentScore: sentimentResult.score,
      sentimentLabel: sentimentResult.label,
      confidence: sentimentResult.confidence,
    })

    return this.moodEntryRepository.save(moodEntry)
  }

  async getMoodHistory(params: GetMoodHistoryDto): Promise<MoodEntry[]> {
    const query = this.moodEntryRepository
      .createQueryBuilder("mood")
      .where("mood.userId = :userId", { userId: params.userId })
      .orderBy("mood.createdAt", "DESC")
      .limit(params.limit || 50)

    if (params.startDate) {
      query.andWhere("mood.createdAt >= :startDate", { startDate: params.startDate })
    }

    if (params.endDate) {
      query.andWhere("mood.createdAt <= :endDate", { endDate: params.endDate })
    }

    return query.getMany()
  }

  async checkMoodConsistency(userId: string, days = 3, threshold = 0.7): Promise<MoodConsistencyResult> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    // Get mood entries for the specified period
    const moodEntries = await this.moodEntryRepository.find({
      where: {
        userId,
        createdAt: Between(startDate, endDate),
      },
      order: {
        createdAt: "ASC",
      },
    })

    if (moodEntries.length === 0) {
      return {
        isConsistent: false,
        consistencyScore: 0,
        daysCovered: 0,
        averageSentiment: 0,
        sentimentVariance: 0,
      }
    }

    // Group entries by day
    const dailyMoods = this.groupMoodsByDay(moodEntries)
    const daysCovered = Object.keys(dailyMoods).length

    if (daysCovered < days) {
      return {
        isConsistent: false,
        consistencyScore: 0,
        daysCovered,
        averageSentiment: 0,
        sentimentVariance: 0,
      }
    }

    // Calculate daily average sentiments
    const dailyAverages = Object.values(dailyMoods).map((entries) => {
      const sum = entries.reduce((acc, entry) => acc + entry.sentimentScore, 0)
      return sum / entries.length
    })

    const averageSentiment = dailyAverages.reduce((acc, val) => acc + val, 0) / dailyAverages.length
    const sentimentVariance = this.calculateVariance(dailyAverages)

    // Calculate consistency score (lower variance = higher consistency)
    const maxVariance = 1 // Maximum possible variance for sentiment scores (-1 to 1)
    const consistencyScore = Math.max(0, 1 - sentimentVariance / maxVariance)

    const isConsistent = consistencyScore >= threshold

    return {
      isConsistent,
      consistencyScore,
      daysCovered,
      averageSentiment,
      sentimentVariance,
    }
  }

  private groupMoodsByDay(moodEntries: MoodEntry[]): Record<string, MoodEntry[]> {
    return moodEntries.reduce(
      (groups, entry) => {
        const day = entry.createdAt.toISOString().split("T")[0]
        if (!groups[day]) {
          groups[day] = []
        }
        groups[day].push(entry)
        return groups
      },
      {} as Record<string, MoodEntry[]>,
    )
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0

    const mean = values.reduce((acc, val) => acc + val, 0) / values.length
    const squaredDifferences = values.map((val) => Math.pow(val - mean, 2))
    return squaredDifferences.reduce((acc, val) => acc + val, 0) / values.length
  }

  async getRecentMoodTrend(
    userId: string,
    days = 7,
  ): Promise<{
    trend: "improving" | "declining" | "stable"
    trendScore: number
    entries: MoodEntry[]
  }> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    const entries = await this.moodEntryRepository.find({
      where: {
        userId,
        createdAt: Between(startDate, endDate),
      },
      order: {
        createdAt: "ASC",
      },
    })

    if (entries.length < 2) {
      return {
        trend: "stable",
        trendScore: 0,
        entries,
      }
    }

    // Calculate trend using linear regression
    const scores = entries.map((entry) => entry.sentimentScore)
    const trendScore = this.calculateTrendScore(scores)

    let trend: "improving" | "declining" | "stable"
    if (trendScore > 0.1) trend = "improving"
    else if (trendScore < -0.1) trend = "declining"
    else trend = "stable"

    return {
      trend,
      trendScore,
      entries,
    }
  }

  private calculateTrendScore(values: number[]): number {
    if (values.length < 2) return 0

    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = values

    const sumX = x.reduce((acc, val) => acc + val, 0)
    const sumY = y.reduce((acc, val) => acc + val, 0)
    const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0)
    const sumXX = x.reduce((acc, val) => acc + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    return slope
  }
}
