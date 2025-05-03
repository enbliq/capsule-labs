import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import type { Model } from "mongoose"
import { v4 as uuidv4 } from "uuid"
import { TimeBombCapsule } from "./schemas/timebomb-capsule.schema"
import type { PlantTimeBombDto } from "./dto/plant-timebomb.dto"
import type { NearbyRequestDto } from "./dto/nearby-request.dto"
import type { NearbyCapsuleDto } from "./dto/nearby-response.dto"
import type { UsersService } from "../../users/users.service"

@Injectable()
export class TimeBombCapsuleService {
  constructor(
    @InjectModel(TimeBombCapsule.name)
    private timeBombModel: Model<TimeBombCapsule>,
    private usersService: UsersService,
  ) {}

  async plantTimeBomb(plantTimeBombDto: PlantTimeBombDto): Promise<TimeBombCapsule> {
    // Validate user exists
    const user = await this.usersService.findByUsername(plantTimeBombDto.username)
    if (!user) {
      throw new BadRequestException(`User with username ${plantTimeBombDto.username} not found`)
    }

    // Validate content based on contentType
    if (plantTimeBombDto.contentType === "text" && !plantTimeBombDto.message) {
      throw new BadRequestException("Message is required for text content type")
    }

    if (plantTimeBombDto.contentType === "media" && !plantTimeBombDto.mediaUrl) {
      throw new BadRequestException("Media URL is required for media content type")
    }

    // Calculate expiration time
    const now = new Date()
    const expiresAt = new Date(now.getTime() + plantTimeBombDto.lifespanMinutes * 60 * 1000)

    // Create new TimeBomb capsule
    const newTimeBomb = new this.timeBombModel({
      id: uuidv4(),
      contentType: plantTimeBombDto.contentType,
      message: plantTimeBombDto.message,
      mediaUrl: plantTimeBombDto.mediaUrl,
      location: plantTimeBombDto.location,
      createdAt: now,
      createdBy: plantTimeBombDto.username,
      expiresAt,
      defusers: [],
      maxDefusers: plantTimeBombDto.maxDefusers,
      status: "active",
    })

    return newTimeBomb.save()
  }

  async findById(id: string): Promise<TimeBombCapsule> {
    const timeBomb = await this.timeBombModel.findOne({ id }).exec()
    if (!timeBomb) {
      throw new NotFoundException(`TimeBomb capsule with id ${id} not found`)
    }
    return timeBomb
  }

  async findNearby(nearbyRequestDto: NearbyRequestDto): Promise<NearbyCapsuleDto[]> {
    const { lat, lng, radius = 300, username } = nearbyRequestDto
    const now = new Date()

    // Create a GeoJSON point for the user's location
    const point = {
      type: "Point",
      coordinates: [lng, lat], // MongoDB uses [longitude, latitude] order
    }

    // Build the aggregation pipeline
    const pipeline = [
      // Find capsules within the specified radius
      {
        $geoNear: {
          near: point,
          distanceField: "distance",
          maxDistance: radius,
          spherical: true,
          query: {
            // Only active capsules
            status: "active",
            // Not expired
            expiresAt: { $gt: now },
            // Not planted by the requesting user (if username provided)
            ...(username && { createdBy: { $ne: username } }),
          },
        },
      },
      // Project only the fields we need
      {
        $project: {
          id: 1,
          distance: 1,
          contentType: 1,
          message: 1,
          mediaUrl: 1,
          expiresAt: 1,
          timeRemaining: {
            $max: [0, { $divide: [{ $subtract: ["$expiresAt", now] }, 1000] }],
          },
        },
      },
    ]

    // Execute the aggregation
    const nearbyCapsules = await this.timeBombModel.aggregate(pipeline).exec()

    // Transform the results to include preview hints
    return nearbyCapsules.map((capsule) => {
      let previewHint = ""

      if (capsule.contentType === "text" && capsule.message) {
        // For text capsules, provide a teaser (first few characters)
        previewHint = capsule.message.length > 20 ? `${capsule.message.substring(0, 20)}...` : capsule.message
      } else if (capsule.contentType === "media") {
        // For media capsules, just indicate there's media content
        previewHint = "Media content available"
      }

      return {
        id: capsule.id,
        distance: Math.round(capsule.distance), // Round to nearest meter
        timeRemaining: Math.floor(capsule.timeRemaining),
        contentType: capsule.contentType,
        previewHint,
      }
    })
  }
}
