import { Controller, Post, Get, Body, Param, Query, HttpStatus, HttpCode } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger"
import type { SocialCapsuleChallengeService } from "./social-capsule-challenge.service"
import type {
  CreateSocialCapsuleDto,
  InviteFriendDto,
  AcceptInviteDto,
  OpenCapsuleDto,
} from "./dto/social-capsule-challenge.dto"

@ApiTags("Social Capsule Challenge")
@Controller("social-capsule-challenge")
export class SocialCapsuleChallengeController {
  constructor(private readonly socialCapsuleService: SocialCapsuleChallengeService) {}

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new social capsule that requires friends to unlock" })
  @ApiResponse({ status: 201, description: "Social capsule created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input or user limit exceeded" })
  async createSocialCapsule(@Body() createDto: CreateSocialCapsuleDto) {
    try {
      const capsule = await this.socialCapsuleService.createSocialCapsule(
        createDto.userId,
        createDto.title,
        createDto.content,
        {
          description: createDto.description,
          ownerEmail: createDto.ownerEmail,
          ownerUsername: createDto.ownerUsername,
          requiredFriends: createDto.requiredFriends,
          expiresIn: createDto.expiresIn,
          metadata: createDto.metadata,
        },
      )

      return {
        success: true,
        message: "Social capsule created successfully",
        data: {
          capsuleId: capsule.capsuleId,
          shareCode: capsule.shareCode,
          requiredFriends: capsule.requiredFriends,
          expiresAt: capsule.expiresAt,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  @Post(":capsuleId/invite")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Invite a friend to participate in the social capsule challenge" })
  @ApiParam({ name: "capsuleId", description: "Social capsule ID" })
  @ApiResponse({ status: 201, description: "Friend invited successfully" })
  @ApiResponse({ status: 404, description: "Capsule not found" })
  @ApiResponse({ status: 409, description: "Friend already invited" })
  async inviteFriend(@Param("capsuleId") capsuleId: string, @Body() inviteDto: InviteFriendDto) {
    try {
      const invite = await this.socialCapsuleService.inviteFriend(
        capsuleId,
        inviteDto.ownerId,
        inviteDto.friendEmail,
        inviteDto.friendId,
        inviteDto.friendUsername,
      )

      return {
        success: true,
        message: "Friend invited successfully",
        data: {
          inviteId: invite.inviteId,
          inviteCode: invite.inviteCode,
          expiresAt: invite.expiresAt,
          friendEmail: invite.toEmail,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  @Post("accept-invite")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Accept an invitation to participate in a social capsule" })
  @ApiResponse({ status: 200, description: "Invite accepted and linked capsule created" })
  @ApiResponse({ status: 404, description: "Invalid invite code" })
  @ApiResponse({ status: 400, description: "Invite expired or already processed" })
  async acceptInvite(@Body() acceptDto: AcceptInviteDto) {
    try {
      const result = await this.socialCapsuleService.acceptInvite(acceptDto.inviteCode, acceptDto.userId)

      return {
        success: true,
        message: "Invite accepted successfully",
        data: {
          originalCapsule: {
            capsuleId: result.invite.capsuleId,
            title: result.invite.capsuleTitle,
            fromUser: result.invite.fromUsername,
          },
          linkedCapsule: {
            capsuleId: result.linkedCapsule.capsuleId,
            title: result.linkedCapsule.title,
            shareCode: result.linkedCapsule.shareCode,
          },
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  @Post(":capsuleId/open")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Open a social capsule (if requirements are met)" })
  @ApiParam({ name: "capsuleId", description: "Social capsule ID" })
  @ApiResponse({ status: 200, description: "Capsule opened successfully" })
  @ApiResponse({ status: 400, description: "Requirements not met or capsule already opened" })
  @ApiResponse({ status: 404, description: "Capsule not found" })
  async openCapsule(@Param("capsuleId") capsuleId: string, @Body() openDto: OpenCapsuleDto) {
    try {
      const result = await this.socialCapsuleService.openCapsule(capsuleId, openDto.userId)

      return {
        success: true,
        message: "Capsule opened successfully",
        data: {
          capsule: {
            capsuleId: result.capsule.capsuleId,
            title: result.capsule.title,
            content: result.capsule.content,
            unlockedAt: result.capsule.unlockedAt,
          },
          unlockedCapsules: result.unlockedCapsules,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  @Get(":capsuleId")
  @ApiOperation({ summary: "Get social capsule details" })
  @ApiParam({ name: "capsuleId", description: "Social capsule ID" })
  @ApiQuery({ name: "userId", description: "User ID (for ownership verification)", required: false })
  @ApiResponse({ status: 200, description: "Capsule details retrieved" })
  @ApiResponse({ status: 404, description: "Capsule not found" })
  async getCapsule(@Param("capsuleId") capsuleId: string, @Query("userId") userId?: string) {
    try {
      const capsule = await this.socialCapsuleService.getCapsule(capsuleId, userId)

      return {
        success: true,
        data: {
          capsuleId: capsule.capsuleId,
          title: capsule.title,
          description: capsule.description,
          isUnlocked: capsule.isUnlocked,
          requiredFriends: capsule.requiredFriends,
          invitedFriends: capsule.invitedFriends.length,
          openedByFriends: capsule.openedByFriends.length,
          createdAt: capsule.createdAt,
          unlockedAt: capsule.unlockedAt,
          expiresAt: capsule.expiresAt,
          shareCode: userId === capsule.ownerId ? capsule.shareCode : undefined,
          content: capsule.content,
          friendDetails: userId === capsule.ownerId ? capsule.invitedFriends : undefined,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  @Get("share/:shareCode")
  @ApiOperation({ summary: "Get capsule details by share code" })
  @ApiParam({ name: "shareCode", description: "Capsule share code" })
  @ApiResponse({ status: 200, description: "Capsule details retrieved" })
  @ApiResponse({ status: 404, description: "Invalid share code" })
  async getCapsuleByShareCode(@Param("shareCode") shareCode: string) {
    try {
      const capsule = await this.socialCapsuleService.getCapsuleByShareCode(shareCode)

      return {
        success: true,
        data: {
          capsuleId: capsule.capsuleId,
          title: capsule.title,
          description: capsule.description,
          ownerUsername: capsule.ownerUsername,
          requiredFriends: capsule.requiredFriends,
          invitedFriends: capsule.invitedFriends.length,
          openedByFriends: capsule.openedByFriends.length,
          isUnlocked: capsule.isUnlocked,
          createdAt: capsule.createdAt,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  @Get("user/:userId/capsules")
  @ApiOperation({ summary: "Get all capsules for a user" })
  @ApiParam({ name: "userId", description: "User ID" })
  @ApiResponse({ status: 200, description: "User capsules retrieved" })
  async getUserCapsules(@Param("userId") userId: string) {
    try {
      const capsules = await this.socialCapsuleService.getUserCapsules(userId)

      return {
        success: true,
        data: capsules.map((capsule) => ({
          capsuleId: capsule.capsuleId,
          title: capsule.title,
          description: capsule.description,
          isUnlocked: capsule.isUnlocked,
          requiredFriends: capsule.requiredFriends,
          invitedFriends: capsule.invitedFriends.length,
          openedByFriends: capsule.openedByFriends.length,
          createdAt: capsule.createdAt,
          unlockedAt: capsule.unlockedAt,
          expiresAt: capsule.expiresAt,
          shareCode: capsule.shareCode,
          isLinked: capsule.metadata?.isLinked || false,
        })),
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  @Get("user/:userId/invites")
  @ApiOperation({ summary: "Get all invites for a user" })
  @ApiParam({ name: "userId", description: "User ID" })
  @ApiResponse({ status: 200, description: "User invites retrieved" })
  async getUserInvites(@Param("userId") userId: string) {
    try {
      const invites = await this.socialCapsuleService.getUserInvites(userId)

      return {
        success: true,
        data: invites.map((invite) => ({
          inviteId: invite.inviteId,
          capsuleId: invite.capsuleId,
          capsuleTitle: invite.capsuleTitle,
          capsuleDescription: invite.capsuleDescription,
          fromUsername: invite.fromUsername,
          status: invite.status,
          createdAt: invite.createdAt,
          acceptedAt: invite.acceptedAt,
          expiresAt: invite.expiresAt,
          inviteCode: invite.status === "pending" ? invite.inviteCode : undefined,
        })),
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  @Get(":capsuleId/network")
  @ApiOperation({ summary: "Get capsule network status and connections" })
  @ApiParam({ name: "capsuleId", description: "Social capsule ID" })
  @ApiResponse({ status: 200, description: "Capsule network retrieved" })
  @ApiResponse({ status: 404, description: "Capsule not found" })
  async getCapsuleNetwork(@Param("capsuleId") capsuleId: string) {
    try {
      const network = await this.socialCapsuleService.getCapsuleNetwork(capsuleId)

      return {
        success: true,
        data: network,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  @Get("user/:userId/statistics")
  @ApiOperation({ summary: "Get user statistics for social capsule challenges" })
  @ApiParam({ name: "userId", description: "User ID" })
  @ApiResponse({ status: 200, description: "User statistics retrieved" })
  async getUserStatistics(@Param("userId") userId: string) {
    try {
      const stats = await this.socialCapsuleService.getUserStatistics(userId)

      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }
}
