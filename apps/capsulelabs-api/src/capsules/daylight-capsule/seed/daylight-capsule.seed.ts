import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { DaylightCapsule } from "../entities/daylight-capsule.entity"

@Injectable()
export class DaylightCapsuleSeed {
  private daylightCapsuleRepository: Repository<DaylightCapsule>

  constructor(
    @InjectRepository(DaylightCapsule)
    daylightCapsuleRepository: Repository<DaylightCapsule>,
  ) {
    this.daylightCapsuleRepository = daylightCapsuleRepository;
  }

  async seed(): Promise<void> {
    // Clear existing data
    await this.daylightCapsuleRepository.clear()

    // Seed data for Northern Hemisphere (UTC)
    const northernHemisphereCapsules = [
      {
        title: "London Daylight Capsule",
        content: "This content is only visible during daylight hours in London.",
        userId: "seed-user-1",
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: "Europe/London",
      },
      {
        title: "New York Daylight Capsule",
        content: "This content is only visible during daylight hours in New York.",
        userId: "seed-user-1",
        latitude: 40.7128,
        longitude: -74.006,
        timezone: "America/New_York",
      },
    ]

    // Seed data for Southern Hemisphere (opposite daylight hours)
    const southernHemisphereCapsules = [
      {
        title: "Sydney Daylight Capsule",
        content: "This content is only visible during daylight hours in Sydney.",
        userId: "seed-user-2",
        latitude: -33.8688,
        longitude: 151.2093,
        timezone: "Australia/Sydney",
      },
      {
        title: "Cape Town Daylight Capsule",
        content: "This content is only visible during daylight hours in Cape Town.",
        userId: "seed-user-2",
        latitude: -33.9249,
        longitude: 18.4241,
        timezone: "Africa/Johannesburg",
      },
    ]

    // Save all capsules
    await this.daylightCapsuleRepository.save([...northernHemisphereCapsules, ...southernHemisphereCapsules])

    console.log("Daylight capsule seed data created successfully")
  }
}
