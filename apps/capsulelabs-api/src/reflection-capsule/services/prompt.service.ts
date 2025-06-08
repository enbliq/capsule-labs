import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { ReflectionPrompt } from "../entities/reflection.entity"

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name)

  constructor(private promptRepository: Repository<ReflectionPrompt>) {}

  async getDailyPrompt(userId: string): Promise<ReflectionPrompt> {
    // Get a random prompt based on the date (consistent for the day)
    const today = new Date()
    const dateString = today.toISOString().split("T")[0]
    const seed = this.hashString(userId + dateString)

    const prompts = await this.promptRepository.find({
      where: { isActive: true },
    })

    if (prompts.length === 0) {
      // Return a default prompt if none exist
      return {
        id: "default",
        title: "Daily Gratitude",
        prompt: "What are three things you're grateful for today?",
        category: "gratitude",
        isActive: true,
        difficulty: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReflectionPrompt
    }

    const index = seed % prompts.length
    return prompts[index]
  }

  async getPromptsByCategory(category: string): Promise<ReflectionPrompt[]> {
    return this.promptRepository.find({
      where: { category: category as any, isActive: true },
      order: { difficulty: "ASC" },
    })
  }

  async getRandomPrompt(): Promise<ReflectionPrompt> {
    const prompts = await this.promptRepository.find({
      where: { isActive: true },
    })

    if (prompts.length === 0) {
      throw new Error("No active prompts available")
    }

    const randomIndex = Math.floor(Math.random() * prompts.length)
    return prompts[randomIndex]
  }

  async createPrompt(promptData: Partial<ReflectionPrompt>): Promise<ReflectionPrompt> {
    const prompt = this.promptRepository.create(promptData)
    return this.promptRepository.save(prompt)
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}
