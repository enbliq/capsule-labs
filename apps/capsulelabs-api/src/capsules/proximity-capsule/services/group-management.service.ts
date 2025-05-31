import { Injectable, Logger } from "@nestjs/common"
import type {
  ProximityCapsule,
  ProximityGroup,
  GroupMember,
  NearbyCheck,
  ProximityData,
  ProximityValidationResult,
} from "../entities/proximity-capsule.entity"
import { GroupStatus, type ProximityMethod } from "../entities/proximity-capsule.entity"

@Injectable()
export class GroupManagementService {
  private readonly logger = new Logger(GroupManagementService.name)

  createGroup(capsule: ProximityCapsule): ProximityGroup {
    const groupId = this.generateGroupId()
    const expiresAt = new Date(Date.now() + capsule.groupConfig.groupFormationTimeout * 1000)

    const group: ProximityGroup = {
      id: groupId,
      capsuleId: capsule.id,
      members: [],
      status: GroupStatus.FORMING,
      createdAt: new Date(),
      expiresAt,
      proximityChecks: [],
    }

    this.logger.log(`Created group ${groupId} for capsule ${capsule.id}`)
    return group
  }

  addMemberToGroup(
    group: ProximityGroup,
    memberData: Omit<GroupMember, "joinedAt" | "lastSeen">,
  ): { success: boolean; message: string } {
    // Check if user is already in the group
    const existingMember = group.members.find((m) => m.userId === memberData.userId)
    if (existingMember) {
      // Update existing member's device if different
      if (existingMember.deviceId !== memberData.deviceId) {
        existingMember.deviceId = memberData.deviceId
        existingMember.lastSeen = new Date()
        existingMember.proximityData = memberData.proximityData
        this.logger.log(`Updated device for user ${memberData.userId} in group ${group.id}`)
      }
      return {
        success: true,
        message: "Member already in group, updated device info",
      }
    }

    // Check group capacity
    const capsule = this.getCapsuleForGroup(group)
    if (capsule?.groupConfig.maxGroupSize && group.members.length >= capsule.groupConfig.maxGroupSize) {
      return {
        success: false,
        message: "Group is at maximum capacity",
      }
    }

    // Check if group has expired
    if (new Date() > group.expiresAt) {
      group.status = GroupStatus.EXPIRED
      return {
        success: false,
        message: "Group formation period has expired",
      }
    }

    // Add member to group
    const member: GroupMember = {
      ...memberData,
      joinedAt: new Date(),
      lastSeen: new Date(),
    }

    group.members.push(member)

    // Update group status if minimum size reached
    if (capsule && group.members.length >= capsule.groupConfig.minGroupSize && group.status === GroupStatus.FORMING) {
      group.status = GroupStatus.ACTIVE
      group.formedAt = new Date()
    }

    this.logger.log(`Added member ${memberData.userId} to group ${group.id}. Total members: ${group.members.length}`)

    return {
      success: true,
      message: "Successfully joined group",
    }
  }

  removeMemberFromGroup(group: ProximityGroup, userId: string): boolean {
    const memberIndex = group.members.findIndex((m) => m.userId === userId)
    if (memberIndex === -1) {
      return false
    }

    group.members.splice(memberIndex, 1)

    // Update group status if below minimum size
    const capsule = this.getCapsuleForGroup(group)
    if (capsule && group.members.length < capsule.groupConfig.minGroupSize && group.status === GroupStatus.ACTIVE) {
      group.status = GroupStatus.FORMING
      group.formedAt = undefined
    }

    this.logger.log(`Removed member ${userId} from group ${group.id}. Remaining members: ${group.members.length}`)
    return true
  }

  updateMemberLastSeen(group: ProximityGroup, userId: string, deviceId: string): boolean {
    const member = group.members.find((m) => m.userId === userId && m.deviceId === deviceId)
    if (!member) {
      return false
    }

    member.lastSeen = new Date()
    return true
  }

  recordProximityCheck(
    group: ProximityGroup,
    checkData: {
      userId: string
      deviceId: string
      detectionMethod: ProximityMethod
      proximityData: ProximityData
      validation: ProximityValidationResult
    },
  ): NearbyCheck {
    const check: NearbyCheck = {
      id: this.generateCheckId(),
      groupId: group.id,
      userId: checkData.userId,
      deviceId: checkData.deviceId,
      timestamp: new Date(),
      detectionMethod: checkData.detectionMethod,
      proximityData: checkData.proximityData,
      isValid: checkData.validation.isValid,
      confidence: checkData.validation.confidence,
    }

    group.proximityChecks.push(check)

    // Keep only recent checks (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    group.proximityChecks = group.proximityChecks.filter((c) => c.timestamp > fiveMinutesAgo)

    return check
  }

  cleanupExpiredGroups(groups: Map<string, ProximityGroup>): void {
    const now = new Date()
    const expiredGroups: string[] = []

    for (const [capsuleId, group] of groups.entries()) {
      if (now > group.expiresAt && group.status !== GroupStatus.UNLOCKED) {
        group.status = GroupStatus.EXPIRED
        expiredGroups.push(capsuleId)
      }
    }

    // Remove expired groups
    expiredGroups.forEach((capsuleId) => {
      groups.delete(capsuleId)
      this.logger.log(`Cleaned up expired group for capsule ${capsuleId}`)
    })
  }

  getInactiveMembers(group: ProximityGroup, timeoutSeconds = 60): GroupMember[] {
    const cutoffTime = new Date(Date.now() - timeoutSeconds * 1000)
    return group.members.filter((member) => member.lastSeen < cutoffTime)
  }

  removeInactiveMembers(group: ProximityGroup, timeoutSeconds = 60): number {
    const inactiveMembers = this.getInactiveMembers(group, timeoutSeconds)

    inactiveMembers.forEach((member) => {
      this.removeMemberFromGroup(group, member.userId)
    })

    if (inactiveMembers.length > 0) {
      this.logger.log(`Removed ${inactiveMembers.length} inactive members from group ${group.id}`)
    }

    return inactiveMembers.length
  }

  getGroupHealth(group: ProximityGroup): {
    memberCount: number
    activeMembers: number
    recentChecks: number
    averageConfidence: number
    status: GroupStatus
  } {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    const activeMembers = group.members.filter((m) => m.lastSeen > oneMinuteAgo).length
    const recentChecks = group.proximityChecks.filter((c) => c.timestamp > fiveMinutesAgo).length
    const validRecentChecks = group.proximityChecks.filter((c) => c.timestamp > fiveMinutesAgo && c.isValid)

    const averageConfidence =
      validRecentChecks.length > 0
        ? validRecentChecks.reduce((sum, c) => sum + c.confidence, 0) / validRecentChecks.length
        : 0

    return {
      memberCount: group.members.length,
      activeMembers,
      recentChecks,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      status: group.status,
    }
  }

  private getCapsuleForGroup(group: ProximityGroup): ProximityCapsule | null {
    // This would typically fetch from the capsule service
    // For now, return null as we don't have direct access
    return null
  }

  private generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCheckId(): string {
    return `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
