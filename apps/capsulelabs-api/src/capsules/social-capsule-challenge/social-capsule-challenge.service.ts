import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { v4 as uuidv4 } from "uuid"

export interface SocialCapsule {
  capsuleId: string
  ownerId: string
  ownerEmail?: string
  ownerUsername?: string
  title: string
  description?: string
  content: any
  requiredFriends: number
  invitedFriends: InvitedFriend[]
  openedByFriends: string[] // Friend IDs who have opened their capsules
  isUnlocked: boolean
  createdAt: number
  unlockedAt?: number
  expiresAt?: number
  shareCode: string
  metadata?: Record<string, any>
}

export interface InvitedFriend {
  friendId: string
  email: string
  username?: string
  invitedAt: number
  acceptedAt?: number
  capsuleOpenedAt?: number
  status: "pending" | "accepted" | "opened" | "expired"
  inviteCode: string
}

export interface SocialCapsuleInvite {
  inviteId: string
  capsuleId: string
  fromUserId: string
  fromUsername?: string
  toUserId: string
  toEmail: string
  inviteCode: string
  status: "pending" | "accepted" | "declined" | "expired"
  createdAt: number
  acceptedAt?: number
  expiresAt: number
  capsuleTitle: string
  capsuleDescription?: string
}

export interface CapsuleNetwork {
  capsuleId: string
  ownerId: string
  connectedCapsules: string[]
  totalConnections: number
  openedConnections: number
  pendingConnections: number
  networkStatus: "incomplete" | "complete" | "unlocked"
}

@Injectable()
export class SocialCapsuleChallengeService {
  private capsules = new Map<string, SocialCapsule>()
  private invites = new Map<string, SocialCapsuleInvite>()
  private userCapsules = new Map<string, string[]>() // userId -> capsuleIds
  private shareCodeMap = new Map<string, string>() // shareCode -> capsuleId
  private inviteCodeMap = new Map<string, string>() // inviteCode -> inviteId

  private readonly requiredFriends: number
  private readonly inviteExpiryTime: number
  private readonly capsuleExpiryTime: number
  private readonly maxCapsulePerUser: number

  constructor(private readonly configService: ConfigService) {
    this.requiredFriends = this.configService.get<number>("SOCIAL_CAPSULE_REQUIRED_FRIENDS", 3)
    this.inviteExpiryTime = this.configService.get<number>("SOCIAL_CAPSULE_INVITE_EXPIRY", 7 * 24 * 60 * 60 * 1000) // 7 days
    this.capsuleExpiryTime = this.configService.get<number>("SOCIAL_CAPSULE_EXPIRY", 30 * 24 * 60 * 60 * 1000) // 30 days
    this.maxCapsulePerUser = this.configService.get<number>("SOCIAL_CAPSULE_MAX_PER_USER", 10)
  }

  async createSocialCapsule(
    ownerId: string,
    title: string,
    content: any,
    options: {
      description?: string
      ownerEmail?: string
      ownerUsername?: string
      requiredFriends?: number
      expiresIn?: number
      metadata?: Record<string, any>
    } = {},
  ): Promise<SocialCapsule> {
    // Check user capsule limit
    const userCapsuleIds = this.userCapsules.get(ownerId) || []
    if (userCapsuleIds.length >= this.maxCapsulePerUser) {
      throw new BadRequestException(`Maximum ${this.maxCapsulePerUser} capsules per user allowed`)
    }

    const capsuleId = uuidv4()
    const shareCode = this.generateShareCode()
    const now = Date.now()

    const capsule: SocialCapsule = {
      capsuleId,
      ownerId,
      ownerEmail: options.ownerEmail,
      ownerUsername: options.ownerUsername,
      title,
      description: options.description,
      content,
      requiredFriends: options.requiredFriends || this.requiredFriends,
      invitedFriends: [],
      openedByFriends: [],
      isUnlocked: false,
      createdAt: now,
      expiresAt: options.expiresIn ? now + options.expiresIn : now + this.capsuleExpiryTime,
      shareCode,
      metadata: options.metadata || {},
    }

    this.capsules.set(capsuleId, capsule)
    this.shareCodeMap.set(shareCode, capsuleId)

    // Update user capsules mapping
    const updatedUserCapsules = [...userCapsuleIds, capsuleId]
    this.userCapsules.set(ownerId, updatedUserCapsules)

    console.log(`Social capsule created: ${capsuleId} by user ${ownerId}`)
    return capsule
  }

  async inviteFriend(
    capsuleId: string,
    ownerId: string,
    friendEmail: string,
    friendId?: string,
    friendUsername?: string,
  ): Promise<SocialCapsuleInvite> {
    const capsule = this.capsules.get(capsuleId)
    if (!capsule) {
      throw new NotFoundException("Capsule not found")
    }

    if (capsule.ownerId !== ownerId) {
      throw new BadRequestException("Only capsule owner can invite friends")
    }

    if (capsule.isUnlocked) {
      throw new BadRequestException("Cannot invite friends to already unlocked capsule")
    }

    // Check if already invited
    const existingInvite = capsule.invitedFriends.find((f) => f.email === friendEmail)
    if (existingInvite) {
      throw new ConflictException("Friend already invited")
    }

    // Check if reached maximum invites
    if (capsule.invitedFriends.length >= capsule.requiredFriends * 2) {
      throw new BadRequestException("Maximum invites reached")
    }

    const inviteId = uuidv4()
    const inviteCode = this.generateInviteCode()
    const now = Date.now()

    const invite: SocialCapsuleInvite = {
      inviteId,
      capsuleId,
      fromUserId: ownerId,
      fromUsername: capsule.ownerUsername,
      toUserId: friendId || `temp_${Date.now()}`,
      toEmail: friendEmail,
      inviteCode,
      status: "pending",
      createdAt: now,
      expiresAt: now + this.inviteExpiryTime,
      capsuleTitle: capsule.title,
      capsuleDescription: capsule.description,
    }

    // Add to capsule's invited friends
    const invitedFriend: InvitedFriend = {
      friendId: friendId || invite.toUserId,
      email: friendEmail,
      username: friendUsername,
      invitedAt: now,
      status: "pending",
      inviteCode,
    }

    capsule.invitedFriends.push(invitedFriend)
    this.invites.set(inviteId, invite)
    this.inviteCodeMap.set(inviteCode, inviteId)

    console.log(`Friend invited to capsule ${capsuleId}: ${friendEmail}`)
    return invite
  }

  async acceptInvite(
    inviteCode: string,
    userId: string,
  ): Promise<{
    invite: SocialCapsuleInvite
    linkedCapsule: SocialCapsule
  }> {
    const inviteId = this.inviteCodeMap.get(inviteCode)
    if (!inviteId) {
      throw new NotFoundException("Invalid invite code")
    }

    const invite = this.invites.get(inviteId)
    if (!invite) {
      throw new NotFoundException("Invite not found")
    }

    if (invite.status !== "pending") {
      throw new BadRequestException("Invite already processed")
    }

    if (Date.now() > invite.expiresAt) {
      invite.status = "expired"
      throw new BadRequestException("Invite has expired")
    }

    const originalCapsule = this.capsules.get(invite.capsuleId)
    if (!originalCapsule) {
      throw new NotFoundException("Original capsule not found")
    }

    // Update invite status
    invite.status = "accepted"
    invite.acceptedAt = Date.now()
    invite.toUserId = userId

    // Update friend status in original capsule
    const friend = originalCapsule.invitedFriends.find((f) => f.inviteCode === inviteCode)
    if (friend) {
      friend.friendId = userId
      friend.acceptedAt = Date.now()
      friend.status = "accepted"
    }

    // Create linked capsule for the friend
    const linkedCapsule = await this.createSocialCapsule(
      userId,
      `Linked: ${originalCapsule.title}`,
      { linkedTo: originalCapsule.capsuleId },
      {
        description: `This capsule is linked to ${originalCapsule.ownerUsername || "a friend"}'s capsule`,
        requiredFriends: 0, // Linked capsules don't need additional friends
        metadata: {
          isLinked: true,
          originalCapsuleId: originalCapsule.capsuleId,
          linkType: "friend_invite",
        },
      },
    )

    console.log(`Invite accepted: ${inviteCode} by user ${userId}`)
    return { invite, linkedCapsule }
  }

  async openCapsule(
    capsuleId: string,
    userId: string,
  ): Promise<{
    capsule: SocialCapsule
    unlockedCapsules: string[]
  }> {
    const capsule = this.capsules.get(capsuleId)
    if (!capsule) {
      throw new NotFoundException("Capsule not found")
    }

    if (capsule.ownerId !== userId) {
      throw new BadRequestException("Only capsule owner can open their capsule")
    }

    if (capsule.isUnlocked) {
      throw new BadRequestException("Capsule already unlocked")
    }

    if (Date.now() > (capsule.expiresAt || 0)) {
      throw new BadRequestException("Capsule has expired")
    }

    // Check if this is a linked capsule (can be opened immediately)
    const isLinked = capsule.metadata?.isLinked === true
    if (isLinked) {
      capsule.isUnlocked = true
      capsule.unlockedAt = Date.now()

      // Notify original capsule that this friend has opened their capsule
      const originalCapsuleId = capsule.metadata?.originalCapsuleId
      if (originalCapsuleId) {
        await this.markFriendCapsuleOpened(originalCapsuleId, userId)
      }

      return { capsule, unlockedCapsules: [capsuleId] }
    }

    // For original capsules, check if enough friends have opened their capsules
    const openedCount = capsule.openedByFriends.length
    if (openedCount < capsule.requiredFriends) {
      throw new BadRequestException(
        `Need ${capsule.requiredFriends - openedCount} more friends to open their capsules first`,
      )
    }

    // Unlock the capsule
    capsule.isUnlocked = true
    capsule.unlockedAt = Date.now()

    console.log(`Capsule unlocked: ${capsuleId} by user ${userId}`)
    return { capsule, unlockedCapsules: [capsuleId] }
  }

  private async markFriendCapsuleOpened(originalCapsuleId: string, friendId: string): Promise<void> {
    const originalCapsule = this.capsules.get(originalCapsuleId)
    if (!originalCapsule) {
      return
    }

    // Add friend to opened list if not already there
    if (!originalCapsule.openedByFriends.includes(friendId)) {
      originalCapsule.openedByFriends.push(friendId)
    }

    // Update friend status
    const friend = originalCapsule.invitedFriends.find((f) => f.friendId === friendId)
    if (friend) {
      friend.status = "opened"
      friend.capsuleOpenedAt = Date.now()
    }

    console.log(`Friend ${friendId} opened capsule for original capsule ${originalCapsuleId}`)

    // Check if original capsule can now be unlocked
    if (originalCapsule.openedByFriends.length >= originalCapsule.requiredFriends) {
      console.log(`Original capsule ${originalCapsuleId} now has enough friends who opened their capsules`)
    }
  }

  async getCapsule(capsuleId: string, userId?: string): Promise<SocialCapsule> {
    const capsule = this.capsules.get(capsuleId)
    if (!capsule) {
      throw new NotFoundException("Capsule not found")
    }

    // Only owner can see full capsule details
    if (userId && capsule.ownerId === userId) {
      return capsule
    }

    // Others see limited information
    return {
      ...capsule,
      content: capsule.isUnlocked ? capsule.content : null,
      invitedFriends: [], // Hide friend details from non-owners
    }
  }

  async getCapsuleByShareCode(shareCode: string): Promise<SocialCapsule> {
    const capsuleId = this.shareCodeMap.get(shareCode)
    if (!capsuleId) {
      throw new NotFoundException("Invalid share code")
    }

    return this.getCapsule(capsuleId)
  }

  async getUserCapsules(userId: string): Promise<SocialCapsule[]> {
    const capsuleIds = this.userCapsules.get(userId) || []
    return capsuleIds.map((id) => this.capsules.get(id)).filter(Boolean) as SocialCapsule[]
  }

  async getUserInvites(userId: string): Promise<SocialCapsuleInvite[]> {
    return Array.from(this.invites.values()).filter((invite) => invite.toUserId === userId)
  }

  async getCapsuleNetwork(capsuleId: string): Promise<CapsuleNetwork> {
    const capsule = this.capsules.get(capsuleId)
    if (!capsule) {
      throw new NotFoundException("Capsule not found")
    }

    const connectedCapsules: string[] = []
    let openedConnections = 0
    let pendingConnections = 0

    // Find all linked capsules created by invited friends
    for (const friend of capsule.invitedFriends) {
      const friendCapsules = this.userCapsules.get(friend.friendId) || []
      for (const friendCapsuleId of friendCapsules) {
        const friendCapsule = this.capsules.get(friendCapsuleId)
        if (friendCapsule?.metadata?.originalCapsuleId === capsuleId) {
          connectedCapsules.push(friendCapsuleId)
          if (friendCapsule.isUnlocked) {
            openedConnections++
          } else {
            pendingConnections++
          }
        }
      }
    }

    const networkStatus: "incomplete" | "complete" | "unlocked" = capsule.isUnlocked
      ? "unlocked"
      : openedConnections >= capsule.requiredFriends
        ? "complete"
        : "incomplete"

    return {
      capsuleId,
      ownerId: capsule.ownerId,
      connectedCapsules,
      totalConnections: connectedCapsules.length,
      openedConnections,
      pendingConnections,
      networkStatus,
    }
  }

  async getUserStatistics(userId: string): Promise<{
    totalCapsules: number
    unlockedCapsules: number
    pendingCapsules: number
    expiredCapsules: number
    totalInvitesSent: number
    totalInvitesReceived: number
    acceptedInvites: number
    friendsHelped: number
    successRate: number
    averageUnlockTime: number
  }> {
    const userCapsules = await this.getUserCapsules(userId)
    const userInvites = await this.getUserInvites(userId)

    const now = Date.now()
    const unlockedCapsules = userCapsules.filter((c) => c.isUnlocked).length
    const pendingCapsules = userCapsules.filter((c) => !c.isUnlocked && now <= (c.expiresAt || 0)).length
    const expiredCapsules = userCapsules.filter((c) => !c.isUnlocked && now > (c.expiresAt || 0)).length

    const totalInvitesSent = userCapsules.reduce((sum, capsule) => sum + capsule.invitedFriends.length, 0)
    const acceptedInvites = userInvites.filter((invite) => invite.status === "accepted").length

    // Count how many friends this user has helped by opening linked capsules
    const friendsHelped = userCapsules.filter((c) => c.metadata?.isLinked && c.isUnlocked).length

    const successRate = userCapsules.length > 0 ? (unlockedCapsules / userCapsules.length) * 100 : 0

    const unlockedCapsulesWithTime = userCapsules.filter((c) => c.isUnlocked && c.unlockedAt)
    const averageUnlockTime =
      unlockedCapsulesWithTime.length > 0
        ? unlockedCapsulesWithTime.reduce((sum, c) => sum + (c.unlockedAt! - c.createdAt), 0) /
          unlockedCapsulesWithTime.length
        : 0

    return {
      totalCapsules: userCapsules.length,
      unlockedCapsules,
      pendingCapsules,
      expiredCapsules,
      totalInvitesSent,
      totalInvitesReceived: userInvites.length,
      acceptedInvites,
      friendsHelped,
      successRate,
      averageUnlockTime,
    }
  }

  async cleanupExpiredInvites(): Promise<number> {
    const now = Date.now()
    let cleanedCount = 0

    for (const [inviteId, invite] of this.invites.entries()) {
      if (invite.status === "pending" && now > invite.expiresAt) {
        invite.status = "expired"
        cleanedCount++

        // Update corresponding friend status in capsule
        const capsule = this.capsules.get(invite.capsuleId)
        if (capsule) {
          const friend = capsule.invitedFriends.find((f) => f.inviteCode === invite.inviteCode)
          if (friend) {
            friend.status = "expired"
          }
        }
      }
    }

    console.log(`Cleaned up ${cleanedCount} expired invites`)
    return cleanedCount
  }

  private generateShareCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase()
  }

  private generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 12).toUpperCase()
  }
}
