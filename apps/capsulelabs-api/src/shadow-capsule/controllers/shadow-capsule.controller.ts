import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, ValidationPipe, Patch } from "@nestjs/common"
import type { ShadowCapsuleService } from "../services/shadow-capsule.service"
import type { CreateShadowCapsuleDto } from "../dto/create-shadow-capsule.dto"
import type { UpdateLocationDto } from "../dto/update-location.dto"
import type { ShadowCapsuleResponseDto, UnlockAttemptResponseDto } from "../dto/shadow-capsule-response.dto"

// Note: You'll need to implement your own authentication guard
// import { AuthGuard } from '@nestjs/passport';
// import { GetUser } from '../auth/get-user.decorator';

@Controller("shadow-capsules")
// @UseGuards(AuthGuard())
export class ShadowCapsuleController {
  constructor(private readonly shadowCapsuleService: ShadowCapsuleService) {}

  @Post()
  async createCapsule(
    @Body() createCapsuleDto: CreateShadowCapsuleDto,
  ): Promise<ShadowCapsuleResponseDto> {
    return await this.shadowCapsuleService.createCapsule(createCapsuleDto)
  }

  @Get()
  async getUserCapsules(
    @Query('userId') userId: string,
  ): Promise<ShadowCapsuleResponseDto[]> {
    return await this.shadowCapsuleService.getUserCapsules(userId)
  }

  @Get(":id")
  async getCapsuleById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId') userId: string,
  ): Promise<ShadowCapsuleResponseDto> {
    return await this.shadowCapsuleService.getCapsuleById(id, userId)
  }

  @Post(":id/unlock")
  async attemptUnlock(
    @Param('id', ParseUUIDPipe) capsuleId: string,
    @Query('userId') userId: string,
  ): Promise<UnlockAttemptResponseDto> {
    return await this.shadowCapsuleService.attemptUnlock(capsuleId, userId)
  }

  @Patch(":id/location")
  async updateLocation(
    @Param('id', ParseUUIDPipe) capsuleId: string,
    @Query('userId') userId: string,
    @Body(ValidationPipe) updateLocationDto: UpdateLocationDto,
  ): Promise<ShadowCapsuleResponseDto> {
    return await this.shadowCapsuleService.updateLocation(capsuleId, userId, updateLocationDto)
  }
}
