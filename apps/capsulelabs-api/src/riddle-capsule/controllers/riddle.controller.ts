import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, ValidationPipe } from "@nestjs/common"
import type { RiddleService } from "../services/riddle.service"
import type { CreateRiddleDto } from "../dto/create-riddle.dto"
import type { Riddle } from "../entities/riddle.entity"
import type { RiddleDifficulty } from "../entities/riddle-capsule.entity"

// Note: This controller should be restricted to admin users
// @UseGuards(AdminGuard)
@Controller("riddles")
export class RiddleController {
  constructor(private readonly riddleService: RiddleService) {}

  @Post()
  async createRiddle(@Body(ValidationPipe) createRiddleDto: CreateRiddleDto): Promise<Riddle> {
    return await this.riddleService.createRiddle(createRiddleDto)
  }

  @Get(":id")
  async getRiddleById(@Param('id', ParseUUIDPipe) id: string): Promise<Riddle> {
    return await this.riddleService.getRiddleById(id)
  }

  @Get("random")
  async getRandomRiddle(
    @Query('difficulty') difficulty?: RiddleDifficulty,
  ): Promise<Riddle> {
    return await this.riddleService.getRandomRiddle(difficulty)
  }
}
