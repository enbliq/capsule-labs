import { Injectable } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { HeartbeatCapsule } from "../entities/heartbeat-capsule.entity"

@Injectable()
export class HeartbeatCapsuleSeed {
  constructor(private readonly heartbeatCapsuleRepository: Repository<HeartbeatCapsule>) {}

  async seed(): Promise<void> {
    // Clear existing data
    await this.heartbeatCapsuleRepository.clear()

    // Seed data with different BPM ranges
    const capsules = [
      {
        title: "Relaxation Capsule",
        content: "This content is only visible when you're relaxed (55-75 BPM).",
        userId: "seed-user-1",
        targetMinBpm: 55,
        targetMaxBpm: 75,
      },
      {
        title: "Exercise Capsule",
        content: "This content is only visible during moderate exercise (100-120 BPM).",
        userId: "seed-user-1",
        targetMinBpm: 100,
        targetMaxBpm: 120,
      },
      {
        title: "Meditation Capsule",
        content: "This content is only visible during deep meditation (40-60 BPM).",
        userId: "seed-user-2",
        targetMinBpm: 40,
        targetMaxBpm: 60,
      },
    ]

    // Save all capsules
    await this.heartbeatCapsuleRepository.save(capsules)

    console.log("Heartbeat capsule seed data created successfully")
  }
}
