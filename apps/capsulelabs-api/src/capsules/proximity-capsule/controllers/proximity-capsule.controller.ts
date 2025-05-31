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
  ValidationPipe,
  UsePipes,
} from "@nestjs/common"
import type { ProximityCapsuleService } from "../services/proximity-capsule.service"
import type {
  CreateProximityCapsuleDto,
  JoinGroupDto,
  UpdateProximityCapsuleDto,
  ProximityQueryDto,
  ProximityCheckDto,
} from "../dto/proximity-capsule.dto"

@Controller("proximity-capsule")
@UsePipes(new ValidationPipe({ transform: true }))
export class ProximityCapsuleController {
  constructor(private readonly proximityCapsuleService: ProximityCapsuleService) {}

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  async createCapsule(@Body() createDto: CreateProximityCapsuleDto) {
    const capsule = await this.proximityCapsuleService.createProximityCapsule(createDto);

    return {
      success: true,
      data: capsule,
      message: "Proximity capsule created successfully",
    };
  }

  @Post("join")
  @HttpCode(HttpStatus.OK)
  async joinGroup(@Body() joinDto: JoinGroupDto) {
    const result = await this.proximityCapsuleService.joinGroup(joinDto)

    return {
      success: result.success,
      data: result.group,
      message: result.message,
      missingMembers: result.missingMembers,
      proximityIssues: result.proximityIssues,
    }
  }

  @Post("proximity-check")
  @HttpCode(HttpStatus.OK)
  async submitProximityCheck(@Body() checkDto: ProximityCheckDto) {
    const result = await this.proximityCapsuleService.submitProximityCheck(checkDto)

    return {
      success: result.isValid,
      data: {
        isValid: result.isValid,
        confidence: result.confidence,
        detectedMethods: result.detectedMethods,
        estimatedDistance: result.estimatedDistance,
        reliability: result.reliability,
      },
      errors: result.errors,
      warnings: result.warnings,
    }
  }

  @Get(":id")
  getCapsule(@Param("id") id: string) {
    const capsule = this.proximityCapsuleService.getCapsule(id)
    const activeGroup = this.proximityCapsuleService.getActiveGroup(id)

    return {
      success: true,
      data: {
        capsule,
        activeGroup,
      },
    }
  }

  @Get(":id/group")
  getActiveGroup(@Param("id") capsuleId: string) {
    const group = this.proximityCapsuleService.getActiveGroup(capsuleId)

    if (!group) {
      return {
        success: false,
        message: "No active group found for this capsule",
      }
    }

    return {
      success: true,
      data: group,
    }
  }

  @Put(":id")
  updateCapsule(@Param("id") id: string, @Body() updateDto: UpdateProximityCapsuleDto) {
    const capsule = this.proximityCapsuleService.updateCapsule(id, updateDto)

    return {
      success: true,
      data: capsule,
      message: "Capsule updated successfully",
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCapsule(@Param("id") id: string) {
    this.proximityCapsuleService.deleteCapsule(id)
  }

  @Get()
  getAllCapsules(@Query() query: ProximityQueryDto) {
    const capsules = this.proximityCapsuleService.getAllCapsules({
      createdBy: query.createdBy,
      unlocked: query.unlocked,
      isActive: query.isActive,
      detectionMethod: query.detectionMethod,
      limit: query.limit,
      offset: query.offset,
    })

    return {
      success: true,
      data: capsules,
      total: capsules.length,
    }
  }

  @Get("user/:userId/unlocked")
  getUserUnlockedCapsules(@Param("userId") userId: string) {
    const capsules = this.proximityCapsuleService.getUserUnlockedCapsules(userId)

    return {
      success: true,
      data: capsules,
      total: capsules.length,
    }
  }

  @Get("group/:groupId/statistics")
  getGroupStatistics(@Param("groupId") groupId: string) {
    const stats = this.proximityCapsuleService.getGroupStatistics(groupId)

    return {
      success: true,
      data: stats,
    }
  }

  @Get("group/:groupId/health")
  getGroupHealth(@Param("groupId") groupId: string) {
    const group = this.proximityCapsuleService.getGroupById(groupId)

    if (!group) {
      return {
        success: false,
        message: "Group not found",
      }
    }

    const health = {
      groupId: group.id,
      memberCount: group.members.length,
      activeMembers: group.members.filter(m => 
        Date.now() - m.lastSeen.getTime() < 60000
      ).length,
      recentChecks: group.proximityChecks.filter(c => 
        Date.now() - c.timestamp.getTime() < 60000
      ).length,
      averageConfidence: group.proximityChecks.length > 0 
        ? group.proximityChecks.reduce((sum, c) => sum + c.confidence, 0) / group.proximityChecks.length
        : 0,
      status: group.status,
      expiresAt: group.expiresAt,
    }

    return {
      success: true,
      data: health,
    }
  }
}
