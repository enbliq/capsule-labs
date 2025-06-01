import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common"
import type {
  ProximityCapsule,
  ProximityGroup,
  GroupFormationResult,
  ProximityValidationResult,
} from "../entities/proximity-capsule.entity"
import { GroupStatus } from "../entities/proximity-capsule.entity"
import type {
  CreateProximityCapsuleDto,
  JoinGroupDto,
  UpdateProximityCapsuleDto,
  ProximityCheckDto,
} from "../dto/proximity-capsule.dto"
import type { ProximityValidationService } from "./proximity-validation.service"
import type { GroupManagementService } from "./group-management.service"

@Injectable()
export class ProximityCapsuleService {
  private readonly logger = new Logger(ProximityCapsuleService.name)
  private capsules = new Map<string, ProximityCapsule>()
  private activeGroups = new Map<string, ProximityGroup>() // capsuleId -> active group
  private userGroups = new Map<string, string>() // userId -> groupId

  constructor(
    private readonly proximityValidation: ProximityValidationService,
    private readonly groupManagement: GroupManagementService,
  ) {}

  async createProximityCapsule(createDto: CreateProximityCapsuleDto): Promise<ProximityCapsule> {
    // Validate configuration
    this.validateCapsuleConfig(createDto)

    const capsuleId = this.generateCapsuleId()
    const capsule: ProximityCapsule = {
      id: capsuleId,
      title: createDto.title,
      description: createDto.description,
      reward: createDto.reward,
      createdBy: createDto.createdBy,
      createdAt: new Date(),
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : undefined,

      groupConfig: createDto.groupConfig,
      proximityConfig: createDto.proximityConfig,

      unlocked: false,
      isActive: true,
    }

    this.capsules.set(capsuleId, capsule)

    this.logger.log(`Created proximity capsule ${capsuleId} requiring ${createDto.groupConfig.minGroupSize} users`)
    return capsule
  }

  async joinGroup(joinDto: JoinGroupDto): Promise<GroupFormationResult> {
    const { capsuleId, userId, deviceId, proximityData } = joinDto

    const capsule = this.capsules.get(capsuleId)
    if (!capsule) {
      throw new NotFoundException(`Capsule with ID ${capsuleId} not found`)
    }

    if (!capsule.isActive) {
      throw new BadRequestException("This capsule is no longer active")
    }

    if (capsule.expiresAt && new Date() > capsule.expiresAt) {
      throw new BadRequestException("This capsule has expired")
    }

    if (capsule.unlocked) {
      throw new BadRequestException("This capsule has already been unlocked")
    }

    // Check if user is already in a group for this capsule
    const existingGroupId = this.userGroups.get(userId)
    if (existingGroupId) {
      const existingGroup = this.activeGroups.get(capsuleId)
      if (existingGroup && existingGroup.id === existingGroupId) {
        return {
          success: false,
          message: "User is already in a group for this capsule",
        }
      }
    }

    // Get or create group for this capsule
    let group = this.activeGroups.get(capsuleId)
    if (!group) {
      group = this.groupManagement.createGroup(capsule)
      this.activeGroups.set(capsuleId, group)
    }

    // Validate proximity data
    const proximityValidation = await this.proximityValidation.validateProximity(
      proximityData,
      capsule.proximityConfig,
      group,
    )

    if (!proximityValidation.isValid) {
      return {
        success: false,
        message: "Proximity validation failed",
        proximityIssues: proximityValidation.errors,
      }
    }

    // Add user to group
    const joinResult = this.groupManagement.addMemberToGroup(group, {
      userId,
      deviceId,
      joinedAt: new Date(),
      lastSeen: new Date(),
      isAuthenticated: true, // Assume authenticated for now
      proximityData,
    })

    if (!joinResult.success) {
      return joinResult
    }

    this.userGroups.set(userId, group.id)

    // Check if group is ready for unlock
    if (group.members.length >= capsule.groupConfig.minGroupSize) {
      const unlockResult = await this.attemptGroupUnlock(capsule, group)
      if (unlockResult.success) {
        return {
          success: true,
          group,
          message: "Group formed and capsule unlocked successfully!",
        }
      }
    }

    return {
      success: true,
      group,
      message: `Joined group successfully. ${capsule.groupConfig.minGroupSize - group.members.length} more members needed.`,
      missingMembers: Math.max(0, capsule.groupConfig.minGroupSize - group.members.length),
    }
  }

  async submitProximityCheck(checkDto: ProximityCheckDto): Promise<ProximityValidationResult> {
    const group = this.getGroupById(checkDto.groupId)
    if (!group) {
      throw new NotFoundException(`Group with ID ${checkDto.groupId} not found`)
    }

    const capsule = this.capsules.get(group.capsuleId)
    if (!capsule) {
      throw new NotFoundException(`Capsule not found for group ${checkDto.groupId}`)
    }

    // Validate proximity
    const validation = await this.proximityValidation.validateProximity(
      checkDto.proximityData,
      capsule.proximityConfig,
      group,
    )

    // Record the check
    const nearbyCheck = this.groupManagement.recordProximityCheck(group, {
      userId: checkDto.userId,
      deviceId: checkDto.deviceId,
      detectionMethod: checkDto.detectionMethod,
      proximityData: checkDto.proximityData,
      validation,
    })

    // Update member last seen
    this.groupManagement.updateMemberLastSeen(group, checkDto.userId, checkDto.deviceId)

    this.logger.log(
      `Proximity check for user ${checkDto.userId} in group ${checkDto.groupId}: ${validation.isValid ? "VALID" : "INVALID"}`,
    )

    return validation
  }

  private async attemptGroupUnlock(capsule: ProximityCapsule, group: ProximityGroup): Promise<GroupFormationResult> {
    // Validate all group members are still in proximity
    const allMembersValid = await this.validateAllMembersProximity(capsule, group)

    if (!allMembersValid) {
      return {
        success: false,
        message: "Not all group members are in valid proximity",
        proximityIssues: ["Some members are too far apart or have weak signals"],
      }
    }

    // Check group formation requirements
    if (group.members.length < capsule.groupConfig.minGroupSize) {
      return {
        success: false,
        message: "Insufficient group size",
        missingMembers: capsule.groupConfig.minGroupSize - group.members.length,
      }
    }

    if (capsule.groupConfig.maxGroupSize && group.members.length > capsule.groupConfig.maxGroupSize) {
      return {
        success: false,
        message: "Group size exceeds maximum allowed",
      }
    }

    // Check authentication requirements
    if (capsule.groupConfig.requireAllAuthenticated) {
      const unauthenticatedMembers = group.members.filter((m) => !m.isAuthenticated)
      if (unauthenticatedMembers.length > 0) {
        return {
          success: false,
          message: "All group members must be authenticated",
        }
      }
    }

    // Unlock the capsule
    capsule.unlocked = true
    capsule.unlockedBy = group.members.map((m) => m.userId)
    capsule.unlockedAt = new Date()
    capsule.unlockedGroup = group

    group.status = GroupStatus.UNLOCKED
    group.unlockedAt = new Date()

    // Clean up
    this.activeGroups.delete(capsule.id)
    group.members.forEach((member) => {
      this.userGroups.delete(member.userId)
    })

    this.logger.log(`Capsule ${capsule.id} unlocked by group ${group.id} with ${group.members.length} members`)

    return {
      success: true,
      group,
      message: "Capsule unlocked successfully!",
    }
  }

  private async validateAllMembersProximity(capsule: ProximityCapsule, group: ProximityGroup): Promise<boolean> {
    const recentChecks = group.proximityChecks.filter(
      (check) => Date.now() - check.timestamp.getTime() < 30000, // Last 30 seconds
    )

    // Check if all members have recent valid proximity checks
    for (const member of group.members) {
      const memberChecks = recentChecks.filter((check) => check.userId === member.userId && check.isValid)

      if (memberChecks.length === 0) {
        this.logger.warn(`Member ${member.userId} has no recent valid proximity checks`)
        return false
      }

      // Validate against other members
      const proximityValidation = await this.proximityValidation.validateProximity(
        member.proximityData,
        capsule.proximityConfig,
        group,
      )

      if (!proximityValidation.isValid || proximityValidation.confidence < capsule.proximityConfig.confidenceLevel) {
        this.logger.warn(`Member ${member.userId} failed proximity validation`)
        return false
      }
    }

    return true
  }

  getCapsule(capsuleId: string): ProximityCapsule {
    const capsule = this.capsules.get(capsuleId)
    if (!capsule) {
      throw new NotFoundException(`Capsule with ID ${capsuleId} not found`)
    }
    return capsule
  }

  getActiveGroup(capsuleId: string): ProximityGroup | null {
    return this.activeGroups.get(capsuleId) || null
  }

  getGroupById(groupId: string): ProximityGroup | null {
    for (const group of this.activeGroups.values()) {
      if (group.id === groupId) {
        return group
      }
    }
    return null
  }

  updateCapsule(capsuleId: string, updateDto: UpdateProximityCapsuleDto): ProximityCapsule {
    const capsule = this.getCapsule(capsuleId)

    if (updateDto.title !== undefined) capsule.title = updateDto.title
    if (updateDto.description !== undefined) capsule.description = updateDto.description
    if (updateDto.reward !== undefined) capsule.reward = updateDto.reward
    if (updateDto.expiresAt !== undefined) {
      capsule.expiresAt = updateDto.expiresAt ? new Date(updateDto.expiresAt) : undefined
    }
    if (updateDto.isActive !== undefined) capsule.isActive = updateDto.isActive
    if (updateDto.groupConfig !== undefined) capsule.groupConfig = updateDto.groupConfig
    if (updateDto.proximityConfig !== undefined) capsule.proximityConfig = updateDto.proximityConfig

    this.logger.log(`Updated proximity capsule ${capsuleId}`)
    return capsule
  }

  deleteCapsule(capsuleId: string): void {
    const capsule = this.getCapsule(capsuleId)

    // Clean up active group
    const activeGroup = this.activeGroups.get(capsuleId)
    if (activeGroup) {
      activeGroup.members.forEach((member) => {
        this.userGroups.delete(member.userId)
      })
      this.activeGroups.delete(capsuleId)
    }

    this.capsules.delete(capsuleId)
    this.logger.log(`Deleted proximity capsule ${capsuleId}`)
  }

  getAllCapsules(filters?: {
    createdBy?: string
    unlocked?: boolean
    isActive?: boolean
    detectionMethod?: string
    limit?: number
    offset?: number
  }): ProximityCapsule[] {
    let capsules = Array.from(this.capsules.values())

    if (filters) {
      if (filters.createdBy) {
        capsules = capsules.filter((c) => c.createdBy === filters.createdBy)
      }
      if (filters.unlocked !== undefined) {
        capsules = capsules.filter((c) => c.unlocked === filters.unlocked)
      }
      if (filters.isActive !== undefined) {
        capsules = capsules.filter((c) => c.isActive === filters.isActive)
      }
      if (filters.detectionMethod) {
        capsules = capsules.filter((c) => c.proximityConfig.detectionMethods.includes(filters.detectionMethod as any))
      }

      // Pagination
      const offset = filters.offset || 0
      const limit = filters.limit || 50
      capsules = capsules.slice(offset, offset + limit)
    }

    return capsules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getUserUnlockedCapsules(userId: string): ProximityCapsule[] {
    return Array.from(this.capsules.values()).filter((c) => c.unlockedBy?.includes(userId))
  }

  getGroupStatistics(groupId: string): any {
    const group = this.getGroupById(groupId)
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`)
    }

    const totalChecks = group.proximityChecks.length
    const validChecks = group.proximityChecks.filter((c) => c.isValid).length
    const averageConfidence =
      group.proximityChecks.length > 0
        ? group.proximityChecks.reduce((sum, c) => sum + c.confidence, 0) / group.proximityChecks.length
        : 0

    const detectionMethods = [...new Set(group.proximityChecks.map((c) => c.detectionMethod))]

    return {
      groupId,
      memberCount: group.members.length,
      status: group.status,
      totalProximityChecks: totalChecks,
      validProximityChecks: validChecks,
      validationRate: totalChecks > 0 ? (validChecks / totalChecks) * 100 : 0,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      detectionMethodsUsed: detectionMethods,
      formationDuration: group.formedAt
        ? Date.now() - group.formedAt.getTime()
        : Date.now() - group.createdAt.getTime(),
    }
  }

  private validateCapsuleConfig(createDto: CreateProximityCapsuleDto): void {
    const { groupConfig, proximityConfig } = createDto

    // Validate group configuration
    if (groupConfig.maxGroupSize && groupConfig.maxGroupSize < groupConfig.minGroupSize) {
      throw new BadRequestException("Maximum group size cannot be less than minimum group size")
    }

    // Validate proximity configuration
    if (proximityConfig.detectionMethods.length === 0) {
      throw new BadRequestException("At least one proximity detection method must be enabled")
    }

    // Validate method-specific configurations
    if (proximityConfig.detectionMethods.includes("bluetooth" as any) && !proximityConfig.bluetoothConfig?.enabled) {
      throw new BadRequestException("Bluetooth configuration is required when Bluetooth detection is enabled")
    }

    if (proximityConfig.detectionMethods.includes("wifi_network" as any) && !proximityConfig.networkConfig?.enabled) {
      throw new BadRequestException("Network configuration is required when WiFi detection is enabled")
    }

    if (proximityConfig.detectionMethods.includes("gps_location" as any) && !proximityConfig.gpsConfig?.enabled) {
      throw new BadRequestException("GPS configuration is required when GPS detection is enabled")
    }
  }

  private generateCapsuleId(): string {
    return `proximity_capsule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
