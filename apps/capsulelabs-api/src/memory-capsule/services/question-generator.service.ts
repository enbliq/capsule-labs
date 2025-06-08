import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { CapsuleInteractionLog, InteractionType } from "../entities/capsule-interaction-log.entity"
import { DailyLog } from "../entities/daily-log.entity"
import { MemoryQuestion, QuestionType } from "../entities/memory-question.entity"
import type { MemoryCapsule } from "../entities/memory-capsule.entity"

@Injectable()
export class QuestionGeneratorService {
  private interactionLogRepository: Repository<CapsuleInteractionLog>
  private dailyLogRepository: Repository<DailyLog>
  private memoryQuestionRepository: Repository<MemoryQuestion>;

  constructor(
    @InjectRepository(CapsuleInteractionLog)
    interactionLogRepository: Repository<CapsuleInteractionLog>,
    @InjectRepository(DailyLog)
    dailyLogRepository: Repository<DailyLog>,
    @InjectRepository(MemoryQuestion)
    private memoryQuestionRepository: Repository<MemoryQuestion>,
  ) {}

  async generateQuestionForCapsule(capsule: MemoryCapsule): Promise<Partial<MemoryQuestion>> {
    const questionTypes = [
      QuestionType.MOOD,
      QuestionType.CAPSULE_INTERACTION,
      QuestionType.DAILY_ACTIVITY,
      QuestionType.TIMESTAMP,
    ]

    // Randomly select a question type
    const selectedType = questionTypes[Math.floor(Math.random() * questionTypes.length)]

    switch (selectedType) {
      case QuestionType.MOOD:
        return await this.generateMoodQuestion(capsule.userId)
      case QuestionType.CAPSULE_INTERACTION:
        return await this.generateCapsuleInteractionQuestion(capsule.userId)
      case QuestionType.DAILY_ACTIVITY:
        return await this.generateDailyActivityQuestion(capsule.userId)
      case QuestionType.TIMESTAMP:
        return await this.generateTimestampQuestion(capsule.userId)
      default:
        return await this.generateMoodQuestion(capsule.userId)
    }
  }

  private async generateMoodQuestion(userId: string): Promise<Partial<MemoryQuestion>> {
    const daysAgo = Math.floor(Math.random() * 7) + 1 // 1-7 days ago
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - daysAgo)

    const dailyLog = await this.dailyLogRepository.findOne({
      where: {
        userId,
        logDate: targetDate,
      },
    })

    if (!dailyLog || !dailyLog.mood) {
      // Fallback to a different question type if no mood data
      return await this.generateCapsuleInteractionQuestion(userId)
    }

    const dayText = daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`

    return {
      question: `What was your mood ${dayText}?`,
      correctAnswer: { mood: dailyLog.mood },
      type: QuestionType.MOOD,
      metadata: {
        targetDate: targetDate.toISOString(),
        daysAgo,
      },
    }
  }

  private async generateCapsuleInteractionQuestion(userId: string): Promise<Partial<MemoryQuestion>> {
    const recentInteractions = await this.interactionLogRepository.find({
      where: {
        userId,
        type: InteractionType.UNLOCKED,
      },
      relations: ["capsule"],
      order: { timestamp: "DESC" },
      take: 10,
    })

    if (recentInteractions.length === 0) {
      return await this.generateTimestampQuestion(userId)
    }

    const randomInteraction = recentInteractions[Math.floor(Math.random() * recentInteractions.length)]
    const daysDiff = Math.floor((Date.now() - randomInteraction.timestamp.getTime()) / (1000 * 60 * 60 * 24))

    let timeText = "recently"
    if (daysDiff === 0) timeText = "today"
    else if (daysDiff === 1) timeText = "yesterday"
    else if (daysDiff <= 7) timeText = `${daysDiff} days ago`
    else timeText = "last week"

    return {
      question: `Which capsule did you unlock ${timeText}?`,
      correctAnswer: {
        capsuleTitle: randomInteraction.capsule.title,
        capsuleId: randomInteraction.capsule.id,
      },
      type: QuestionType.CAPSULE_INTERACTION,
      metadata: {
        targetInteractionId: randomInteraction.id,
        targetDate: randomInteraction.timestamp.toISOString(),
      },
    }
  }

  private async generateDailyActivityQuestion(userId: string): Promise<Partial<MemoryQuestion>> {
    const daysAgo = Math.floor(Math.random() * 5) + 1 // 1-5 days ago
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - daysAgo)

    const dailyLog = await this.dailyLogRepository.findOne({
      where: {
        userId,
        logDate: targetDate,
      },
    })

    if (!dailyLog || !dailyLog.activities || dailyLog.activities.length === 0) {
      return await this.generateMoodQuestion(userId)
    }

    const dayText = daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`

    return {
      question: `What activities did you do ${dayText}?`,
      correctAnswer: { activities: dailyLog.activities },
      type: QuestionType.DAILY_ACTIVITY,
      metadata: {
        targetDate: targetDate.toISOString(),
        daysAgo,
      },
    }
  }

  private async generateTimestampQuestion(userId: string): Promise<Partial<MemoryQuestion>> {
    const recentLogs = await this.interactionLogRepository.find({
      where: { userId },
      order: { timestamp: "DESC" },
      take: 20,
    })

    if (recentLogs.length === 0) {
      // Fallback question
      return {
        question: "What day of the week is it today?",
        correctAnswer: { dayOfWeek: new Date().toLocaleDateString("en-US", { weekday: "long" }) },
        type: QuestionType.TIMESTAMP,
        metadata: { fallback: true },
      }
    }

    const randomLog = recentLogs[Math.floor(Math.random() * recentLogs.length)]
    const logDate = new Date(randomLog.timestamp)
    const dayOfWeek = logDate.toLocaleDateString("en-US", { weekday: "long" })

    return {
      question: `On which day of the week did you last interact with your capsules?`,
      correctAnswer: { dayOfWeek },
      type: QuestionType.TIMESTAMP,
      metadata: {
        targetTimestamp: randomLog.timestamp.toISOString(),
        targetLogId: randomLog.id,
      },
    }
  }
}
