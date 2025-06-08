import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger"
import type { ReflectionService } from "./services/reflection.service"
import type { ReflectionStreakService } from "./services/reflection-streak.service"
import type { PromptService } from "./services/prompt.service"
import type { CreateReflectionDto, UpdateReflectionDto } from "./dto/reflection.dto"

@ApiTags("Reflection Capsule")
@Controller("reflection-capsule")
// @UseGuards(JwtAuthGuard) // Uncomment when you have auth setup
export class ReflectionCapsuleController {
  constructor(
    private reflectionService: ReflectionService,
    private reflectionStreakService: ReflectionStreakService,
    private promptService: PromptService,
  ) {}

  @Get("today")
  @ApiOperation({ summary: "Get today's reflection status" })
  @ApiResponse({ status: 200, description: "Today's reflection status retrieved successfully" })
  async getTodaysReflection(req: any) {
    const userId = req.user?.id || "demo-user"

    const reflection = await this.reflectionService.getTodaysReflection(userId)
    const canReflect = await this.reflectionService.canUserReflectToday(userId)
    const streakStats = await this.reflectionStreakService.getStreakStats(userId)

    return {
      success: true,
      data: {
        hasReflected: !!reflection,
        reflection,
        canReflect: canReflect.canReflect,
        reason: canReflect.reason,
        streak: {
          current: streakStats.currentStreak,
          daysUntilUnlock: streakStats.daysUntilUnlock,
          capsuleUnlocked: streakStats.capsuleUnlocked,
        },
      },
    }
  }

  @Post("reflect")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new daily reflection" })
  @ApiResponse({ status: 201, description: "Reflection created successfully" })
  @ApiResponse({ status: 400, description: "Invalid reflection data or already submitted today" })
  async createReflection(req: any, @Body() createReflectionDto: CreateReflectionDto) {
    const userId = req.user?.id || "demo-user"

    const result = await this.reflectionService.createReflection(userId, createReflectionDto)

    return {
      success: true,
      data: {
        reflection: result.reflection,
        currentStreak: result.currentStreak,
        capsuleUnlocked: result.capsuleUnlocked,
      },
      message: result.capsuleUnlocked
        ? "🎉 Congratulations! You've unlocked the Reflection Capsule after 7 days of gratitude!"
        : `Reflection saved! Current streak: ${result.currentStreak} day${result.currentStreak !== 1 ? "s" : ""}`,
    }
  }

  @Put("reflect/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update today's reflection" })
  @ApiParam({ name: "id", description: "Reflection ID" })
  @ApiResponse({ status: 200, description: "Reflection updated successfully" })
  @ApiResponse({ status: 403, description: "Cannot edit past reflections or edit window expired" })
  @ApiResponse({ status: 404, description: "Reflection not found" })
  async updateReflection(
    req: any,
    @Param("id") reflectionId: string,
    @Body() updateReflectionDto: UpdateReflectionDto,
  ) {
    const userId = req.user?.id || "demo-user"

    const reflection = await this.reflectionService.updateReflection(userId, reflectionId, updateReflectionDto)

    return {
      success: true,
      data: { reflection },
      message: "Reflection updated successfully",
    }
  }

  @Delete("reflect/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete today's reflection" })
  @ApiParam({ name: "id", description: "Reflection ID" })
  @ApiResponse({ status: 200, description: "Reflection deleted successfully" })
  @ApiResponse({ status: 403, description: "Cannot delete past reflections or delete window expired" })
  async deleteReflection(req: any, @Param("id") reflectionId: string) {
    const userId = req.user?.id || "demo-user"

    await this.reflectionService.deleteReflection(userId, reflectionId)

    return {
      success: true,
      message: "Reflection deleted successfully",
    }
  }

  @Get("history")
  @ApiOperation({ summary: "Get reflection history" })
  @ApiQuery({ name: "limit", required: false, description: "Number of reflections to return" })
  @ApiQuery({ name: "offset", required: false, description: "Number of reflections to skip" })
  @ApiResponse({ status: 200, description: "Reflection history retrieved successfully" })
  async getReflectionHistory(req: any, @Query("limit") limit?: string, @Query("offset") offset?: string) {
    const userId = req.user?.id || "demo-user"
    const limitNum = limit ? Number.parseInt(limit) : 30
    const offsetNum = offset ? Number.parseInt(offset) : 0

    if (limitNum > 100) {
      throw new BadRequestException("Limit cannot exceed 100")
    }

    const history = await this.reflectionService.getReflectionHistory(userId, limitNum, offsetNum)

    return {
      success: true,
      data: history,
    }
  }

  @Get("reflect/:id")
  @ApiOperation({ summary: "Get a specific reflection" })
  @ApiParam({ name: "id", description: "Reflection ID" })
  @ApiResponse({ status: 200, description: "Reflection retrieved successfully" })
  @ApiResponse({ status: 404, description: "Reflection not found" })
  async getReflection(req: any, @Param("id") reflectionId: string) {
    const userId = req.user?.id || "demo-user"

    const reflection = await this.reflectionService.getReflectionById(userId, reflectionId)

    return {
      success: true,
      data: { reflection },
    }
  }

  @Get("streak")
  @ApiOperation({ summary: "Get streak statistics" })
  @ApiResponse({ status: 200, description: "Streak statistics retrieved successfully" })
  async getStreakStats(req: any) {
    const userId = req.user?.id || "demo-user"

    const stats = await this.reflectionStreakService.getStreakStats(userId)

    return {
      success: true,
      data: stats,
    }
  }

  @Get("stats")
  @ApiOperation({ summary: "Get reflection statistics" })
  @ApiResponse({ status: 200, description: "Reflection statistics retrieved successfully" })
  async getReflectionStats(req: any) {
    const userId = req.user?.id || "demo-user"

    const stats = await this.reflectionService.getReflectionStats(userId)

    return {
      success: true,
      data: stats,
    }
  }

  @Get("prompt/daily")
  @ApiOperation({ summary: "Get today's reflection prompt" })
  @ApiResponse({ status: 200, description: "Daily prompt retrieved successfully" })
  async getDailyPrompt(req: any) {
    const userId = req.user?.id || "demo-user"

    const prompt = await this.promptService.getDailyPrompt(userId)

    return {
      success: true,
      data: { prompt },
    }
  }

  @Get("prompt/random")
  @ApiOperation({ summary: "Get a random reflection prompt" })
  @ApiResponse({ status: 200, description: "Random prompt retrieved successfully" })
  async getRandomPrompt() {
    const prompt = await this.promptService.getRandomPrompt()

    return {
      success: true,
      data: { prompt },
    }
  }

  @Get("prompt/category/:category")
  @ApiOperation({ summary: "Get prompts by category" })
  @ApiParam({ name: "category", description: "Prompt category" })
  @ApiResponse({ status: 200, description: "Category prompts retrieved successfully" })
  async getPromptsByCategory(@Param("category") category: string) {
    const prompts = await this.promptService.getPromptsByCategory(category)

    return {
      success: true,
      data: { prompts },
    }
  }

  @Post("recalculate-streak")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Recalculate user's reflection streak (admin/debug)" })
  @ApiResponse({ status: 200, description: "Streak recalculated successfully" })
  async recalculateStreak(req: any) {
    const userId = req.user?.id || "demo-user"

    const streak = await this.reflectionStreakService.recalculateStreak(userId)

    return {
      success: true,
      data: { streak },
      message: "Streak recalculated successfully",
    }
  }
}
