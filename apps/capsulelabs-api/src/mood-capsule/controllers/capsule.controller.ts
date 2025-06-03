import { Controller, Post, Get, Body, Param, Put } from "@nestjs/common"
import type { CapsuleService } from "../services/capsule.service"
import type { CreateCapsuleDto } from "../dto/create-capsule.dto"

@Controller("capsules")
export class CapsuleController {
  constructor(private readonly capsuleService: CapsuleService) {}

  @Post()
  async createCapsule(@Body() createCapsuleDto: CreateCapsuleDto) {
    return this.capsuleService.createCapsule(createCapsuleDto);
  }

  @Get('user/:userId')
  async getUserCapsules(@Param('userId') userId: string) {
    return this.capsuleService.getUserCapsules(userId);
  }

  @Get(":id/user/:userId")
  async getCapsule(@Param('id') id: string, @Param('userId') userId: string) {
    return this.capsuleService.getCapsuleById(id, userId)
  }

  @Post('check-unlock/:userId')
  async checkAndUnlockCapsules(@Param('userId') userId: string) {
    return this.capsuleService.checkAndUnlockCapsules(userId);
  }

  @Put(":id/open/:userId")
  async openCapsule(@Param('id') id: string, @Param('userId') userId: string) {
    return this.capsuleService.openCapsule(id, userId)
  }

  @Get('stats/:userId')
  async getCapsuleStats(@Param('userId') userId: string) {
    return this.capsuleService.getCapsuleStats(userId);
  }
}
