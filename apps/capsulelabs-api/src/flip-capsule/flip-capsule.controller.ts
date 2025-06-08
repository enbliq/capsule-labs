import { Controller, Get, Post, Body, Query, HttpStatus, HttpCode } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import type { FlipSessionService } from "./services/flip-session.service"
import type { FlipChallengeConfigDto } from "./dto/orientation.dto"

@ApiTags("Flip Capsule")
@Controller("flip-capsule")
// @UseGuards(JwtAuthGuard) // Uncomment when you have auth setup
export class FlipCapsuleController {
  constructor(private readonly flipSessionService: FlipSessionService) {}

  @Get("status")
  @ApiOperation({ summary: "Get user's flip capsule status" })
  @ApiResponse({ status: 200, description: "Capsule status retrieved successfully" })
  async getCapsuleStatus(req: any) {
    const userId = req.user?.id || "demo-user"

    const status = await this.flipSessionService.getUserUnlockStatus(userId)

    return {
      success: true,
      data: {
        hasUnlockedCapsule: status.hasUnlockedCapsule,
        lastSession: status.lastSession,
        totalAttempts: status.totalAttempts,
        unlockDetails: status.unlockDetails,
      },
    }
  }

  @Get("history")
  @ApiOperation({ summary: "Get user's session history" })
  @ApiResponse({ status: 200, description: "Session history retrieved successfully" })
  async getSessionHistory(req: any, @Query("limit") limit: string = "10") {
    const userId = req.user?.id || "demo-user"
    const limitNum = Number.parseInt(limit)

    const history = await this.flipSessionService.getUserSessionHistory(userId, limitNum)

    return {
      success: true,
      data: history,
    }
  }

  @Get("config")
  @ApiOperation({ summary: "Get current flip challenge configuration" })
  @ApiResponse({ status: 200, description: "Configuration retrieved successfully" })
  async getConfig() {
    const config = await this.flipSessionService.getActiveConfig()

    return {
      success: true,
      data: {
        config,
        clientInstructions: {
          requiredDurationSeconds: config.requiredDuration / 1000,
          instructions: "Flip your phone upside down and hold it steady for the required duration.",
          tips: [
            "Make sure your device has orientation sensors enabled",
            "Hold your phone steady while flipped",
            "The timer will reset if you move too much or flip back",
          ],
        },
      },
    }
  }

  @Post("config")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update flip challenge configuration (admin only)" })
  @ApiResponse({ status: 200, description: "Configuration updated successfully" })
  async updateConfig(@Body() configDto: FlipChallengeConfigDto) {
    const config = await this.flipSessionService.updateConfig(configDto)

    return {
      success: true,
      data: { config },
      message: "Configuration updated successfully",
    }
  }
}
