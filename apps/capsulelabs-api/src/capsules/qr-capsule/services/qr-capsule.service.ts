import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common"
import type { QrCapsule, ScanResult } from "../entities/qr-capsule.entity"
import { ScanErrorCode, QrCapsuleStatus } from "../entities/qr-capsule.entity"
import type { CreateQrCapsuleDto, ScanQrDto, UpdateQrCapsuleDto } from "../dto/qr-capsule.dto"
import type { QrCodeService } from "./qr-code.service"
import type { GeoValidationService } from "./geo-validation.service"
import type { TimeValidationService } from "./time-validation.service"

@Injectable()
export class QrCapsuleService {
  private readonly logger = new Logger(QrCapsuleService.name)
  private capsules = new Map<string, QrCapsule>()
  private hashToCapsuleId = new Map<string, string>()
  private userUnlocks = new Map<string, Set<string>>() // userId -> Set of capsuleIds

  constructor(
    private readonly qrCodeService: QrCodeService,
    private readonly geoValidationService: GeoValidationService,
    private readonly timeValidationService: TimeValidationService,
  ) {}

  async createQrCapsule(createDto: CreateQrCapsuleDto): Promise<QrCapsule> {
    // Validate geo restrictions
    if (createDto.geoLocked) {
      if (!createDto.latitude || !createDto.longitude || !createDto.radiusMeters) {
        throw new BadRequestException("Geo-locked capsules require latitude, longitude, and radiusMeters")
      }
    }

    const capsuleId = this.generateCapsuleId()
    const qrCodeHash = await this.qrCodeService.generateQrCodeHash(capsuleId)

    const capsule: QrCapsule = {
      id: capsuleId,
      qrCodeHash,
      title: createDto.title,
      description: createDto.description,
      reward: createDto.reward,
      createdBy: createDto.createdBy,
      createdAt: new Date(),
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : undefined,

      geoLocked: createDto.geoLocked || false,
      latitude: createDto.latitude,
      longitude: createDto.longitude,
      radiusMeters: createDto.radiusMeters,

      timeWindow: createDto.timeWindow,

      unlocked: false,
      currentUses: 0,
      maxUses: createDto.maxUses,
      isActive: true,
    }

    this.capsules.set(capsuleId, capsule)
    this.hashToCapsuleId.set(qrCodeHash, capsuleId)

    this.logger.log(`Created QR capsule ${capsuleId} with hash ${qrCodeHash}`)
    return capsule
  }

  async scanQrCode(scanDto: ScanQrDto): Promise<ScanResult> {
    const { qrCodeHash, userId, location } = scanDto

    // Find capsule by QR hash
    const capsuleId = this.hashToCapsuleId.get(qrCodeHash)
    if (!capsuleId) {
      return {
        success: false,
        message: "Invalid QR code",
        errorCode: ScanErrorCode.INVALID_QR,
      }
    }

    const capsule = this.capsules.get(capsuleId)
    if (!capsule) {
      return {
        success: false,
        message: "Capsule not found",
        errorCode: ScanErrorCode.INVALID_QR,
      }
    }

    // Check if capsule is active
    if (!capsule.isActive) {
      return {
        success: false,
        message: "This capsule is no longer active",
        errorCode: ScanErrorCode.INACTIVE,
      }
    }

    // Check if expired
    if (capsule.expiresAt && new Date() > capsule.expiresAt) {
      return {
        success: false,
        message: "This QR code has expired",
        errorCode: ScanErrorCode.EXPIRED,
      }
    }

    // Check max uses
    if (capsule.maxUses && capsule.currentUses >= capsule.maxUses) {
      return {
        success: false,
        message: "This capsule has reached its maximum number of uses",
        errorCode: ScanErrorCode.MAX_USES_REACHED,
      }
    }

    // Check if user already unlocked this capsule
    const userUnlocks = this.userUnlocks.get(userId) || new Set()
    if (userUnlocks.has(capsuleId)) {
      return {
        success: false,
        message: "You have already unlocked this capsule",
        errorCode: ScanErrorCode.ALREADY_UNLOCKED,
      }
    }

    // Validate geo restrictions
    if (capsule.geoLocked) {
      if (!location) {
        return {
          success: false,
          message: "Location is required for this geo-locked capsule",
          errorCode: ScanErrorCode.GEO_RESTRICTED,
        }
      }

      const isWithinRange = this.geoValidationService.isWithinRange(
        location,
        {
          latitude: capsule.latitude!,
          longitude: capsule.longitude!,
        },
        capsule.radiusMeters!,
      )

      if (!isWithinRange) {
        return {
          success: false,
          message: "You are not within the required location to unlock this capsule",
          errorCode: ScanErrorCode.GEO_RESTRICTED,
        }
      }
    }

    // Validate time restrictions
    if (capsule.timeWindow) {
      const isWithinTimeWindow = this.timeValidationService.isWithinTimeWindow(capsule.timeWindow)

      if (!isWithinTimeWindow) {
        return {
          success: false,
          message: "This capsule can only be unlocked during specific time windows",
          errorCode: ScanErrorCode.TIME_RESTRICTED,
        }
      }
    }

    // All validations passed - unlock the capsule
    return this.unlockCapsule(capsule, userId)
  }

  private unlockCapsule(capsule: QrCapsule, userId: string): ScanResult {
    // Update capsule
    capsule.unlocked = true
    capsule.unlockedBy = userId
    capsule.unlockedAt = new Date()
    capsule.currentUses++

    // Track user unlock
    if (!this.userUnlocks.has(userId)) {
      this.userUnlocks.set(userId, new Set())
    }
    this.userUnlocks.get(userId)!.add(capsule.id)

    this.logger.log(`User ${userId} unlocked capsule ${capsule.id}`)

    return {
      success: true,
      capsule,
      reward: capsule.reward,
      message: `Congratulations! You've unlocked: ${capsule.title}`,
    }
  }

  getCapsule(capsuleId: string): QrCapsule {
    const capsule = this.capsules.get(capsuleId)
    if (!capsule) {
      throw new NotFoundException(`Capsule with ID ${capsuleId} not found`)
    }
    return capsule
  }

  updateCapsule(capsuleId: string, updateDto: UpdateQrCapsuleDto): QrCapsule {
    const capsule = this.getCapsule(capsuleId)

    if (updateDto.title !== undefined) capsule.title = updateDto.title
    if (updateDto.description !== undefined) capsule.description = updateDto.description
    if (updateDto.reward !== undefined) capsule.reward = updateDto.reward
    if (updateDto.expiresAt !== undefined) {
      capsule.expiresAt = updateDto.expiresAt ? new Date(updateDto.expiresAt) : undefined
    }
    if (updateDto.isActive !== undefined) capsule.isActive = updateDto.isActive
    if (updateDto.maxUses !== undefined) capsule.maxUses = updateDto.maxUses

    this.logger.log(`Updated capsule ${capsuleId}`)
    return capsule
  }

  deleteCapsule(capsuleId: string): void {
    const capsule = this.getCapsule(capsuleId)

    this.capsules.delete(capsuleId)
    this.hashToCapsuleId.delete(capsule.qrCodeHash)

    this.logger.log(`Deleted capsule ${capsuleId}`)
  }

  getAllCapsules(filters?: {
    createdBy?: string
    unlocked?: boolean
    isActive?: boolean
    limit?: number
    offset?: number
  }): QrCapsule[] {
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

      // Pagination
      const offset = filters.offset || 0
      const limit = filters.limit || 50
      capsules = capsules.slice(offset, offset + limit)
    }

    return capsules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getUserUnlocks(userId: string): QrCapsule[] {
    const unlockedCapsuleIds = this.userUnlocks.get(userId) || new Set()
    return Array.from(unlockedCapsuleIds)
      .map((id) => this.capsules.get(id))
      .filter(Boolean) as QrCapsule[]
  }

  getCapsuleStatus(capsule: QrCapsule): QrCapsuleStatus {
    if (!capsule.isActive) return QrCapsuleStatus.INACTIVE
    if (capsule.expiresAt && new Date() > capsule.expiresAt) return QrCapsuleStatus.EXPIRED
    if (capsule.maxUses && capsule.currentUses >= capsule.maxUses) return QrCapsuleStatus.EXHAUSTED
    return QrCapsuleStatus.ACTIVE
  }

  async generateQrCodeData(capsuleId: string): Promise<string> {
    const capsule = this.getCapsule(capsuleId)
    return this.qrCodeService.generateQrCodeData(capsule.qrCodeHash)
  }

  private generateCapsuleId(): string {
    return `qr_capsule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
