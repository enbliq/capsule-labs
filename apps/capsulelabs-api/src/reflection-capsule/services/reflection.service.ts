import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { DailyReflection } from "../entities/reflection.entity"
import type { ReflectionStreakService } from "./reflection-streak.service"
import type { CreateReflectionDto, UpdateReflectionDto } from "../dto/reflection.dto"

@Injectable()
export class ReflectionService {
  private readonly logger = new Logger(ReflectionService.name)

  constructor(
    private reflectionRepository: Repository<DailyReflection>,
    private reflectionStreakService: ReflectionStreakService,
  ) {}

  async createReflection(
    userId: string,
    createReflectionDto: CreateReflectionDto,
  ): Promise<{
    reflection: DailyReflection
    streakUpdated: boolean
    capsuleUnlocked: boolean
    currentStreak: number
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if user already has a reflection for today
    const existingReflection = await this.reflectionRepository.findOne({
      where: {
        userId,
        reflectionDate: today,
      },
    })

    if (existingReflection) {
      throw new BadRequestException("You have already submitted a reflection for today")
    }

    // Validate content length and quality
    const wordCount = this.countWords(createReflectionDto.content)
    const characterCount = createReflectionDto.content.length

    if (wordCount < 5) {
      throw new BadRequestException("Reflection must contain at least 5 words")
    }

    // Create the reflection
    const reflection = this.reflectionRepository.create({
      userId,
      reflectionDate: today,
      content: createReflectionDto.content,
      gratitudeNote: createReflectionDto.gratitudeNote,
      mood: createReflectionDto.mood,
      tags: createReflectionDto.tags || [],
      wordCount,
      characterCount,
      metadata: {
        submittedAt: new Date(),
        ipAddress: null, // You can add IP tracking if needed
      },
    })

    await this.reflectionRepository.save(reflection)

    // Update streak
    const streakResult = await this.reflectionStreakService.updateStreak(userId)

    this.logger.log(`Created reflection for user ${userId} on ${today.toDateString()}`)

    return {
      reflection,
      streakUpdated: true,
      capsuleUnlocked: streakResult.capsuleUnlocked,
      currentStreak: streakResult.currentStreak,
    }
  }

  async updateReflection(
    userId: string,
    reflectionId: string,
    updateReflectionDto: UpdateReflectionDto,
  ): Promise<DailyReflection> {
    const reflection = await this.reflectionRepository.findOne({
      where: { id: reflectionId, userId },
    })

    if (!reflection) {
      throw new NotFoundException("Reflection not found")
    }

    // Check if reflection is from today (only allow editing today's reflection)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (reflection.reflectionDate.getTime() !== today.getTime()) {
      throw new ForbiddenException("You can only edit today's reflection")
    }

    // Check edit window (e.g., only allow editing within 2 hours of creation)
    const editWindowHours = 2
    const editDeadline = new Date(reflection.createdAt.getTime() + editWindowHours * 60 * 60 * 1000)

    if (new Date() > editDeadline) {
      throw new ForbiddenException(`Editing is only allowed within ${editWindowHours} hours of creation`)
    }

    // Update fields
    if (updateReflectionDto.content) {
      const wordCount = this.countWords(updateReflectionDto.content)
      if (wordCount < 5) {
        throw new BadRequestException("Reflection must contain at least 5 words")
      }
      reflection.content = updateReflectionDto.content
      reflection.wordCount = wordCount
      reflection.characterCount = updateReflectionDto.content.length
    }

    if (updateReflectionDto.gratitudeNote !== undefined) {
      reflection.gratitudeNote = updateReflectionDto.gratitudeNote
    }

    if (updateReflectionDto.mood) {
      reflection.mood = updateReflectionDto.mood
    }

    if (updateReflectionDto.tags) {
      reflection.tags = updateReflectionDto.tags
    }

    reflection.isEdited = true
    reflection.lastEditedAt = new Date()

    await this.reflectionRepository.save(reflection)

    this.logger.log(`Updated reflection ${reflectionId} for user ${userId}`)

    return reflection
  }

  async getTodaysReflection(userId: string): Promise<DailyReflection | null> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return this.reflectionRepository.findOne({
      where: {
        userId,
        reflectionDate: today,
      },
    })
  }

  async getReflectionHistory(
    userId: string,
    limit = 30,
    offset = 0,
  ): Promise<{
    reflections: DailyReflection[]
    total: number
    hasMore: boolean
  }> {
    const [reflections, total] = await this.reflectionRepository.findAndCount({
      where: { userId },
      order: { reflectionDate: "DESC" },
      take: limit,
      skip: offset,
    })

    return {
      reflections,
      total,
      hasMore: offset + limit < total,
    }
  }

  async getReflectionById(userId: string, reflectionId: string): Promise<DailyReflection> {
    const reflection = await this.reflectionRepository.findOne({
      where: { id: reflectionId, userId },
    })

    if (!reflection) {
      throw new NotFoundException("Reflection not found")
    }

    return reflection
  }

  async deleteReflection(userId: string, reflectionId: string): Promise<void> {
    const reflection = await this.reflectionRepository.findOne({
      where: { id: reflectionId, userId },
    })

    if (!reflection) {
      throw new NotFoundException("Reflection not found")
    }

    // Only allow deletion of today's reflection within 1 hour
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (reflection.reflectionDate.getTime() !== today.getTime()) {
      throw new ForbiddenException("You can only delete today's reflection")
    }

    const deleteDeadline = new Date(reflection.createdAt.getTime() + 60 * 60 * 1000) // 1 hour

    if (new Date() > deleteDeadline) {
      throw new ForbiddenException("Deletion is only allowed within 1 hour of creation")
    }

    await this.reflectionRepository.remove(reflection)

    // Update streak (this will likely reset it)
    await this.reflectionStreakService.recalculateStreak(userId)

    this.logger.log(`Deleted reflection ${reflectionId} for user ${userId}`)
  }

  async getReflectionStats(userId: string): Promise<{
    totalReflections: number
    averageWordCount: number
    averageCharacterCount: number
    moodDistribution: Record<string, number>
    tagFrequency: Record<string, number>
    longestReflection: number
    shortestReflection: number
    recentActivity: { date: string; wordCount: number }[]
  }> {
    const reflections = await this.reflectionRepository.find({
      where: { userId },
      order: { reflectionDate: "DESC" },
    })

    if (reflections.length === 0) {
      return {
        totalReflections: 0,
        averageWordCount: 0,
        averageCharacterCount: 0,
        moodDistribution: {},
        tagFrequency: {},
        longestReflection: 0,
        shortestReflection: 0,
        recentActivity: [],
      }
    }

    const totalWordCount = reflections.reduce((sum, r) => sum + r.wordCount, 0)
    const totalCharacterCount = reflections.reduce((sum, r) => sum + r.characterCount, 0)

    const moodDistribution: Record<string, number> = {}
    const tagFrequency: Record<string, number> = {}

    reflections.forEach((reflection) => {
      // Mood distribution
      if (reflection.mood) {
        moodDistribution[reflection.mood] = (moodDistribution[reflection.mood] || 0) + 1
      }

      // Tag frequency
      reflection.tags?.forEach((tag) => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1
      })
    })

    const wordCounts = reflections.map((r) => r.wordCount)
    const recentActivity = reflections
      .slice(0, 14) // Last 14 days
      .map((r) => ({
        date: r.reflectionDate.toISOString().split("T")[0],
        wordCount: r.wordCount,
      }))

    return {
      totalReflections: reflections.length,
      averageWordCount: Math.round(totalWordCount / reflections.length),
      averageCharacterCount: Math.round(totalCharacterCount / reflections.length),
      moodDistribution,
      tagFrequency,
      longestReflection: Math.max(...wordCounts),
      shortestReflection: Math.min(...wordCounts),
      recentActivity,
    }
  }

  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length
  }

  async canUserReflectToday(userId: string): Promise<{
    canReflect: boolean
    reason?: string
    existingReflection?: DailyReflection
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingReflection = await this.reflectionRepository.findOne({
      where: {
        userId,
        reflectionDate: today,
      },
    })

    if (existingReflection) {
      return {
        canReflect: false,
        reason: "Already submitted reflection for today",
        existingReflection,
      }
    }

    return {
      canReflect: true,
    }
  }
}
