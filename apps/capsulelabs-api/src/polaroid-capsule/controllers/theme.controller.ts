import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common"
import type { ThemeService } from "../services/theme.service"
import type { CreatePhotoThemeDto } from "../dto/create-photo-theme.dto"
import type { PhotoTheme } from "../entities/photo-theme.entity"
import type { DailyTheme } from "../entities/daily-theme.entity"

// Note: This controller should be restricted to admin users for theme creation
// @UseGuards(AdminGuard)
@Controller("photo-themes")
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Post()
  async createTheme(@Body() createThemeDto: CreatePhotoThemeDto): Promise<PhotoTheme> {
    return await this.themeService.createTheme(createThemeDto)
  }

  @Get()
  async getAllThemes(@Query('activeOnly') activeOnly: boolean = true): Promise<PhotoTheme[]> {
    return await this.themeService.getAllThemes(activeOnly)
  }

  @Get("category/:category")
  async getThemesByCategory(
    @Param('category') category: string,
    @Query('activeOnly') activeOnly: boolean = true,
  ): Promise<PhotoTheme[]> {
    return await this.themeService.getThemesByCategory(category, activeOnly)
  }

  @Get(":id")
  async getThemeById(@Param('id') id: string): Promise<PhotoTheme> {
    return await this.themeService.getThemeById(id)
  }

  @Get("daily/:userId")
  async getDailyTheme(@Param('userId') userId: string): Promise<DailyTheme> {
    return await this.themeService.getDailyTheme(userId)
  }
}
