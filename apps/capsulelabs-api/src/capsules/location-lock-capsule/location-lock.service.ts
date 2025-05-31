import { Injectable, NotFoundException, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { LocationLockCapsule } from "./entities/location-lock-capsule.entity"
import type { CreateLocationLockCapsuleDto } from "./dto/create-location-lock-capsule.dto"
import type { UnlockAttemptDto } from "./dto/unlock-attempt.dto"
import type { UnlockResponseDto } from "./dto/unlock-response.dto"

@Injectable()
export class LocationLockService {
  private readonly logger = new Logger(LocationLockService.name)

  constructor(private readonly capsuleRepository: Repository<LocationLockCapsule>) {}

  async create(createDto: CreateLocationLockCapsuleDto, userId: string): Promise<LocationLockCapsule> {
    this.logger.log(`Creating new capsule for user: ${userId}`)

    const capsule = this.capsuleRepository.create({
      ...createDto,
      userId,
    })

    const savedCapsule = await this.capsuleRepository.save(capsule)

    this.logger.log(`Capsule created successfully: ${savedCapsule.id}`)
    return savedCapsule
  }

  async findAll(userId?: string): Promise<LocationLockCapsule[]> {
    const query = this.capsuleRepository.createQueryBuilder("capsule")

    if (userId) {
      query.where("capsule.userId = :userId", { userId })
    }

    // Don't return content in list view for security
    query.select([
      "capsule.id",
      "capsule.title",
      "capsule.userId",
      "capsule.lockLatitude",
      "capsule.lockLongitude",
      "capsule.allowedRadiusMeters",
      "capsule.createdAt",
      "capsule.updatedAt",
    ])

    const capsules = await query.getMany()
    this.logger.log(`Retrieved ${capsules.length} capsules${userId ? ` for user: ${userId}` : ""}`)

    return capsules
  }

  async findOne(id: string): Promise<LocationLockCapsule> {
    const capsule = await this.capsuleRepository.findOne({
      where: { id },
      select: [
        "id",
        "title",
        "userId",
        "lockLatitude",
        "lockLongitude",
        "allowedRadiusMeters",
        "createdAt",
        "updatedAt",
      ],
    })

    if (!capsule) {
      this.logger.warn(`Capsule not found: ${id}`)
      throw new NotFoundException("Capsule not found")
    }

    return capsule
  }

  async attemptUnlock(id: string, unlockDto: UnlockAttemptDto): Promise<UnlockResponseDto> {
    this.logger.log(`Unlock attempt for capsule: ${id}`)

    const capsule = await this.capsuleRepository.findOne({
      where: { id },
    })

    if (!capsule) {
      this.logger.warn(`Unlock attempt failed - capsule not found: ${id}`)
      throw new NotFoundException("Capsule not found")
    }

    const distance = this.calculateHaversineDistance(
      capsule.lockLatitude,
      capsule.lockLongitude,
      unlockDto.currentLatitude,
      unlockDto.currentLongitude,
    )

    const isWithinRange = distance <= capsule.allowedRadiusMeters

    this.logger.log(
      `Unlock attempt - Distance: ${distance.toFixed(2)}m, Required: ${capsule.allowedRadiusMeters}m, Success: ${isWithinRange}`,
    )

    const response: UnlockResponseDto = {
      success: isWithinRange,
      message: isWithinRange
        ? "Capsule unlocked successfully!"
        : `You are ${Math.round(distance)}m away. Get within ${capsule.allowedRadiusMeters}m to unlock.`,
      distanceMeters: Math.round(distance * 100) / 100, // Round to 2 decimal places
    }

    if (isWithinRange) {
      response.content = capsule.content
      response.title = capsule.title
      this.logger.log(`Capsule unlocked successfully: ${id}`)
    }

    return response
  }

  /**
   * Calculate the distance between two points using the Haversine formula
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lon2 Longitude of second point
   * @returns Distance in meters
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  async seedTestData(): Promise<void> {
    this.logger.log("Seeding test data...")

    // Check if test data already exists
    const existingCapsules = await this.capsuleRepository.count()
    if (existingCapsules > 0) {
      this.logger.log("Test data already exists, skipping seed")
      return
    }

    // Times Square coordinates
    const timesSquareCapsule = {
      title: "Times Square Secret",
      content: "Welcome to the crossroads of the world! You found the Times Square capsule! 🗽",
      userId: "test-user",
      lockLatitude: 40.758,
      lockLongitude: -73.9855,
      allowedRadiusMeters: 50,
    }

    // Central Park coordinates
    const centralParkCapsule = {
      title: "Central Park Treasure",
      content: "Nature in the heart of the city! You discovered the Central Park secret! 🌳",
      userId: "test-user",
      lockLatitude: 40.7829,
      lockLongitude: -73.9654,
      allowedRadiusMeters: 30,
    }

    // Brooklyn Bridge coordinates
    const brooklynBridgeCapsule = {
      title: "Brooklyn Bridge Mystery",
      content: "A historic crossing! You found the Brooklyn Bridge capsule! 🌉",
      userId: "test-user",
      lockLatitude: 40.7061,
      lockLongitude: -73.9969,
      allowedRadiusMeters: 40,
    }

    await this.capsuleRepository.save([timesSquareCapsule, centralParkCapsule, brooklynBridgeCapsule])

    this.logger.log("Test capsules seeded successfully!")
  }

  async getStats(): Promise<{
    totalCapsules: number
    capsulesPerUser: Record<string, number>
    averageRadius: number
  }> {
    const capsules = await this.capsuleRepository.find()

    const capsulesPerUser = capsules.reduce(
      (acc, capsule) => {
        acc[capsule.userId] = (acc[capsule.userId] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const averageRadius =
      capsules.length > 0
        ? capsules.reduce((sum, capsule) => sum + capsule.allowedRadiusMeters, 0) / capsules.length
        : 0

    return {
      totalCapsules: capsules.length,
      capsulesPerUser,
      averageRadius: Math.round(averageRadius * 100) / 100,
    }
  }
}
