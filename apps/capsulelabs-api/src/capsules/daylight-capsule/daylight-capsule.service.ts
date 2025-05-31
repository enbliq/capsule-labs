import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { SunriseSunsetJS } from "sunrise-sunset-js"
import { DaylightCapsule } from "./entities/daylight-capsule.entity"
import type { CreateDaylightCapsuleDto } from "./dto/create-daylight-capsule.dto"
import type { ViewDaylightCapsuleDto } from "./dto/view-daylight-capsule.dto"

@Injectable()
export class DaylightCapsuleService {
  constructor(
    @InjectRepository(DaylightCapsule)
    private readonly daylightCapsuleRepository: Repository<DaylightCapsule>,
  ) {}

  async create(createDaylightCapsuleDto: CreateDaylightCapsuleDto, userId: string): Promise<DaylightCapsule> {
    const capsule = this.daylightCapsuleRepository.create({
      ...createDaylightCapsuleDto,
      userId,
    })

    return this.daylightCapsuleRepository.save(capsule)
  }

  async findOne(id: string, currentTime?: Date): Promise<ViewDaylightCapsuleDto> {
    const capsule = await this.daylightCapsuleRepository.findOne({ where: { id } })

    if (!capsule) {
      throw new NotFoundException(`Daylight capsule with ID ${id} not found`)
    }

    // Use provided time or current time
    const now = currentTime || new Date()

    // Calculate sunrise and sunset times
    const sunrise = SunriseSunsetJS.getSunrise(capsule.latitude, capsule.longitude, now)

    const sunset = SunriseSunsetJS.getSunset(capsule.latitude, capsule.longitude, now)

    // Adjust for timezone
    const userLocalTime = this.adjustTimeForTimezone(now, capsule.timezone)
    const sunriseLocal = this.adjustTimeForTimezone(sunrise, capsule.timezone)
    const sunsetLocal = this.adjustTimeForTimezone(sunset, capsule.timezone)

    // Check if current time is between sunrise and sunset
    const isDaylight = userLocalTime >= sunriseLocal && userLocalTime <= sunsetLocal

    const response: ViewDaylightCapsuleDto = {
      id: capsule.id,
      title: capsule.title,
      isLocked: !isDaylight,
      sunrise: sunriseLocal.toISOString(),
      sunset: sunsetLocal.toISOString(),
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }

    // Only include content if it's daylight
    if (isDaylight) {
      response.content = capsule.content
    }

    return response
  }

  async findAll(userId: string, currentTime?: Date): Promise<ViewDaylightCapsuleDto[]> {
    const capsules = await this.daylightCapsuleRepository.find({
      where: { userId },
    })

    return Promise.all(
      capsules.map(async (capsule) => {
        try {
          return await this.findOne(capsule.id, currentTime)
        } catch (error) {
          // If there's an error processing a capsule, return a locked version
          return {
            id: capsule.id,
            title: capsule.title,
            isLocked: true,
            createdAt: capsule.createdAt,
            updatedAt: capsule.updatedAt,
          }
        }
      }),
    )
  }

  private adjustTimeForTimezone(date: Date, timezone: string): Date {
    try {
      // Create a date string with the timezone
      const dateString = date.toLocaleString("en-US", { timeZone: timezone })
      // Parse the date string back to a Date object
      return new Date(dateString)
    } catch (error) {
      // If timezone is invalid, return the original date
      console.error(`Invalid timezone: ${timezone}`, error)
      return date
    }
  }
}
