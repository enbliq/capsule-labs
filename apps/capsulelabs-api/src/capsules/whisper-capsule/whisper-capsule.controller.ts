import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpStatus, Query } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger"
import type { WhisperCapsuleService } from "./whisper-capsule.service"
import type { CreateWhisperCapsuleDto } from "./dto/create-whisper-capsule.dto"
import type { CheckWeatherUnlockDto } from "./dto/check-weather-unlock.dto"
import { ViewWhisperCapsuleDto } from "./dto/view-whisper-capsule.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@ApiTags("whisper-capsules")
@Controller("capsules/whisper")
export class WhisperCapsuleController {
  constructor(private readonly whisperCapsuleService: WhisperCapsuleService) {}

  @Post("create")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new whisper capsule with weather conditions" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The capsule has been successfully created.",
    type: ViewWhisperCapsuleDto,
  })
  async create(
    @Body() createWhisperCapsuleDto: CreateWhisperCapsuleDto,
    @Request() req,
  ): Promise<ViewWhisperCapsuleDto> {
    const capsule = await this.whisperCapsuleService.create(createWhisperCapsuleDto, req.user.id)
    return {
      id: capsule.id,
      title: capsule.title,
      unlocked: capsule.unlocked,
      latitude: capsule.latitude,
      longitude: capsule.longitude,
      locationName: capsule.locationName,
      condition: {
        requiredWeatherType: capsule.requiredWeatherType,
        temperatureOperator: capsule.temperatureOperator,
        temperatureValue: capsule.temperatureValue,
        temperatureValueMax: capsule.temperatureValueMax,
      },
      checkCount: capsule.checkCount,
      unlockedAt: capsule.unlockedAt,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all whisper capsules for the current user" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all capsules for the user",
    type: [ViewWhisperCapsuleDto],
  })
  async findAll(@Request() req) {
    const capsules = await this.whisperCapsuleService.findAll(req.user.id)
    return capsules.map(capsule => ({
      id: capsule.id,
      title: capsule.title,
      unlocked: capsule.unlocked,
      latitude: capsule.latitude,
      longitude: capsule.longitude,
      locationName: capsule.locationName,
      condition: {
        requiredWeatherType: capsule.requiredWeatherType,
        temperatureOperator: capsule.temperatureOperator,
        temperatureValue: capsule.temperatureValue,
        temperatureValueMax: capsule.temperatureValueMax,
      },
      checkCount: capsule.checkCount,
      unlockedAt: capsule.unlockedAt,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }))
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a whisper capsule by ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the capsule information",
    type: ViewWhisperCapsuleDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  async findOne(@Param('id') id: string, @Request() req) {
    const capsule = await this.whisperCapsuleService.findOne(id)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== req.user.id) {
      throw new Error("You don't have permission to access this capsule")
    }

    const response: ViewWhisperCapsuleDto = {
      id: capsule.id,
      title: capsule.title,
      unlocked: capsule.unlocked,
      latitude: capsule.latitude,
      longitude: capsule.longitude,
      locationName: capsule.locationName,
      condition: {
        requiredWeatherType: capsule.requiredWeatherType,
        temperatureOperator: capsule.temperatureOperator,
        temperatureValue: capsule.temperatureValue,
        temperatureValueMax: capsule.temperatureValueMax,
      },
      checkCount: capsule.checkCount,
      unlockedAt: capsule.unlockedAt,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }

    // Only include content if unlocked
    if (capsule.unlocked) {
      response.content = capsule.content
    }

    return response
  }

  @Post(":id/check")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check weather conditions and try to unlock a capsule" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the capsule with current weather and unlock status",
    type: ViewWhisperCapsuleDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  checkWeatherUnlock(@Param('id') id: string, @Body() checkWeatherDto: CheckWeatherUnlockDto, @Request() req) {
    return this.whisperCapsuleService.checkWeatherUnlock(id, checkWeatherDto, req.user.id)
  }

  @Get(":id/history")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get weather check history for a capsule" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the weather check history",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Capsule not found" })
  getWeatherHistory(@Param('id') id: string, @Request() req) {
    return this.whisperCapsuleService.getWeatherHistory(id, req.user.id)
  }

  @Get("weather/current")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current weather for specified coordinates" })
  @ApiQuery({ name: "lat", description: "Latitude", type: Number })
  @ApiQuery({ name: "lon", description: "Longitude", type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns current weather data",
  })
  getCurrentWeather(@Query('lat') latitude: number, @Query('lon') longitude: number) {
    return this.whisperCapsuleService.getCurrentWeatherForLocation(latitude, longitude)
  }
}
