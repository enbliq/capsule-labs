import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, ValidationPipe } from "@nestjs/common"
import type { PolaroidCapsuleService } from "../services/polaroid-capsule.service"
import type { CreatePolaroidCapsuleDto } from "../dto/create-polaroid-capsule.dto"
import type { SubmitPhotoDto } from "../dto/submit-photo.dto"
import type { PolaroidCapsuleResponseDto, SubmitPhotoResponseDto } from "../dto/polaroid-capsule-response.dto"

// Note: You'll need to implement your own authentication guard
// import { AuthGuard } from '@nestjs/passport';
// import { GetUser } from '../auth/get-user.decorator';

@Controller("polaroid-capsules")
// @UseGuards(AuthGuard())
export class PolaroidCapsuleController {
  constructor(private readonly polaroidCapsuleService: PolaroidCapsuleService) {}

  @Post()
  async createCapsule(createCapsuleDto: CreatePolaroidCapsuleDto): Promise<PolaroidCapsuleResponseDto> {
    return await this.polaroidCapsuleService.createCapsule(createCapsuleDto)
  }

  @Get()
  async getUserCapsules(
    @Query('userId') userId: string,
  ): Promise<PolaroidCapsuleResponseDto[]> {
    return await this.polaroidCapsuleService.getUserCapsules(userId)
  }

  @Get(":id")
  async getCapsuleById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId') userId: string,
  ): Promise<PolaroidCapsuleResponseDto> {
    return await this.polaroidCapsuleService.getCapsuleById(id, userId)
  }

  @Post("submit-photo")
  async submitPhoto(
    @Query('userId') userId: string,
    @Body(ValidationPipe) submitPhotoDto: SubmitPhotoDto,
  ): Promise<SubmitPhotoResponseDto> {
    return await this.polaroidCapsuleService.submitPhoto(userId, submitPhotoDto)
  }
}
