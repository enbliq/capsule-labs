import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { Riddle, RiddleCategory } from "../entities/riddle.entity"
import { RiddleDifficulty } from "../entities/riddle-capsule.entity"
import type { CreateRiddleDto } from "../dto/create-riddle.dto"
import type { HttpService } from "@nestjs/axios"
import type { ConfigService } from "@nestjs/config"
import { firstValueFrom } from "rxjs"

@Injectable()
export class RiddleService {
  private readonly externalApiUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @InjectRepository(Riddle)
    private riddleRepository: Repository<Riddle>,
  ) {
    this.externalApiUrl = this.configService.get<string>("RIDDLE_API_URL", "https://api.example.com/riddles")
  }

  async createRiddle(createRiddleDto: CreateRiddleDto): Promise<Riddle> {
    const riddle = this.riddleRepository.create(createRiddleDto)
    return await this.riddleRepository.save(riddle)
  }

  async getRiddleById(id: string): Promise<Riddle> {
    const riddle = await this.riddleRepository.findOne({
      where: { id },
    })

    if (!riddle) {
      throw new NotFoundException("Riddle not found")
    }

    return riddle
  }

  async getRandomRiddle(difficulty?: RiddleDifficulty, category?: RiddleCategory): Promise<Riddle> {
    const queryBuilder = this.riddleRepository.createQueryBuilder("riddle").where("riddle.isActive = :isActive", {
      isActive: true,
    })

    if (difficulty) {
      queryBuilder.andWhere("riddle.difficulty = :difficulty", { difficulty })
    }

    if (category) {
      queryBuilder.andWhere("riddle.category = :category", { category })
    }

    // Order by usage count (ascending) and then randomly
    queryBuilder.orderBy("riddle.usageCount", "ASC").addOrderBy("RANDOM()")

    // Get the first result
    const riddle = await queryBuilder.getOne()

    if (!riddle) {
      throw new NotFoundException("No suitable riddles found")
    }

    // Increment usage count
    await this.riddleRepository.update(riddle.id, {
      usageCount: () => "usage_count + 1",
    })

    return riddle
  }

  async getRiddlesFromExternalApi(difficulty?: RiddleDifficulty): Promise<Riddle> {
    try {
      let apiUrl = this.externalApiUrl
      if (difficulty) {
        apiUrl += `?difficulty=${difficulty.toLowerCase()}`
      }

      const response = await firstValueFrom(this.httpService.get(apiUrl))
      const riddleData = response.data

      // Map external API response to our Riddle entity structure
      // This assumes the API returns data in a compatible format
      // You may need to adjust this mapping based on the actual API response
      const riddle = new Riddle()
      riddle.id = riddleData.id || `external-${Date.now()}`
      riddle.question = riddleData.question
      riddle.answer = riddleData.answer
      riddle.hint = riddleData.hint
      riddle.difficulty = this.mapExternalDifficultyToInternal(riddleData.difficulty)
      riddle.category = this.mapExternalCategoryToInternal(riddleData.category)
      riddle.metadata = { source: "external_api", originalData: riddleData }

      return riddle
    } catch (error) {
      // If external API fails, fall back to internal database
      console.error("External riddle API error:", error.message)
      return this.getRandomRiddle(difficulty)
    }
  }

  private mapExternalDifficultyToInternal(externalDifficulty: string): RiddleDifficulty {
    const difficultyMap = {
      easy: RiddleDifficulty.EASY,
      medium: RiddleDifficulty.MEDIUM,
      hard: RiddleDifficulty.HARD,
      expert: RiddleDifficulty.EXPERT,
    }

    return difficultyMap[externalDifficulty?.toLowerCase()] || RiddleDifficulty.MEDIUM
  }

  private mapExternalCategoryToInternal(externalCategory: string): RiddleCategory {
    const categoryMap = {
      wordplay: RiddleCategory.WORDPLAY,
      logic: RiddleCategory.LOGIC,
      math: RiddleCategory.MATH,
      lateral: RiddleCategory.LATERAL,
      mystery: RiddleCategory.MYSTERY,
      riddle: RiddleCategory.RIDDLE,
    }

    return categoryMap[externalCategory?.toLowerCase()] || RiddleCategory.RIDDLE
  }
}
