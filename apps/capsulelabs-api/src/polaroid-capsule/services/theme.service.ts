import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { PhotoTheme } from "../entities/photo-theme.entity"
import { DailyTheme } from "../entities/daily-theme.entity"
import type { CreatePhotoThemeDto } from "../dto/create-photo-theme.dto"

@Injectable()
export class ThemeService {
  constructor(
    @InjectRepository(PhotoTheme)
    private readonly photoThemeRepository: Repository<PhotoTheme>,
    @InjectRepository(DailyTheme)
    private readonly dailyThemeRepository: Repository<DailyTheme>,
  ) {}

  async createTheme(createThemeDto: CreatePhotoThemeDto): Promise<PhotoTheme> {
    const theme = this.photoThemeRepository.create(createThemeDto)
    return await this.photoThemeRepository.save(theme)
  }

  async getThemeById(id: string): Promise<PhotoTheme> {
    const theme = await this.photoThemeRepository.findOne({
      where: { id },
    })

    if (!theme) {
      throw new NotFoundException("Theme not found")
    }

    return theme
  }

  async getAllThemes(activeOnly = true): Promise<PhotoTheme[]> {
    const query: any = {}
    if (activeOnly) {
      query.isActive = true
    }

    return await this.photoThemeRepository.find({
      where: query,
      order: { usageCount: "ASC" },
    })
  }

  async getThemesByCategory(category: string, activeOnly = true): Promise<PhotoTheme[]> {
    const query: any = { category }
    if (activeOnly) {
      query.isActive = true
    }

    return await this.photoThemeRepository.find({
      where: query,
      order: { usageCount: "ASC" },
    })
  }

  async getDailyTheme(userId: string, date: Date = new Date()): Promise<DailyTheme> {
    // Format date to remove time component
    const formattedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    // Check if a theme is already assigned for this user and date
    let dailyTheme = await this.dailyThemeRepository.findOne({
      where: {
        userId,
        date: formattedDate,
      },
      relations: ["theme"],
    })

    // If no theme is assigned, assign a new one
    if (!dailyTheme) {
      dailyTheme = await this.assignNewDailyTheme(userId, formattedDate)
    }

    return dailyTheme
  }

  private async assignNewDailyTheme(userId: string, date: Date): Promise<DailyTheme> {
    // Get all active themes
    const themes = await this.getAllThemes(true)

    if (themes.length === 0) {
      throw new Error("No active themes available")
    }

    // Select a random theme, with preference for less used themes
    const sortedThemes = themes.sort((a, b) => a.usageCount - b.usageCount)
    const selectedTheme = sortedThemes[0]

    // Increment usage count
    selectedTheme.usageCount += 1
    await this.photoThemeRepository.save(selectedTheme)

    // Create daily theme
    const dailyTheme = this.dailyThemeRepository.create({
      userId,
      themeId: selectedTheme.id,
      date,
      theme: selectedTheme,
    })

    return await this.dailyThemeRepository.save(dailyTheme)
  }
}
