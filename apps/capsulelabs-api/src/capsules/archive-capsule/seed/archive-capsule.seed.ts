import { Injectable } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type ArchiveCapsule, MediaType } from "../entities/archive-capsule.entity"

@Injectable()
export class ArchiveCapsuleSeed {
  private readonly archiveCapsuleRepository: Repository<ArchiveCapsule>

  constructor(archiveCapsuleRepository: Repository<ArchiveCapsule>) {
    this.archiveCapsuleRepository = archiveCapsuleRepository
  }

  async seed(): Promise<void> {
    // Clear existing data
    await this.archiveCapsuleRepository.clear()

    // Create sample archive capsules with different media types and requirements
    const capsules = [
      {
        title: "Historical Documentary",
        content: "Exclusive behind-the-scenes content and director's commentary for this award-winning documentary.",
        userId: "seed-user-1",
        mediaUrl: "https://example.com/videos/history-doc.mp4",
        mediaTitle: "The Rise and Fall of Ancient Civilizations",
        mediaType: MediaType.VIDEO,
        mediaDurationSeconds: 5400, // 90 minutes
        minimumEngagementSeconds: 4320, // 72 minutes (80%)
        minimumCompletionPercentage: 0.85,
        requireFullCompletion: false,
        allowPausing: true,
        maxPauseTimeSeconds: 600, // 10 minutes total pause time
        unlocked: false,
        totalEngagementSeconds: 0,
        completionPercentage: 0,
      },
      {
        title: "Educational Podcast Series",
        content: "Complete transcript, additional resources, and bonus interview content.",
        userId: "seed-user-1",
        mediaUrl: "https://example.com/audio/science-podcast.mp3",
        mediaTitle: "Understanding Quantum Physics - Episode 1",
        mediaType: MediaType.AUDIO,
        mediaDurationSeconds: 2700, // 45 minutes
        minimumEngagementSeconds: 2430, // 40.5 minutes (90%)
        minimumCompletionPercentage: 0.95,
        requireFullCompletion: true,
        allowPausing: true,
        maxPauseTimeSeconds: 300, // 5 minutes total pause time
        unlocked: false,
        totalEngagementSeconds: 0,
        completionPercentage: 0,
      },
      {
        title: "Interactive Training Module",
        content: "Advanced techniques, certification, and access to the expert community.",
        userId: "seed-user-2",
        mediaUrl: "https://example.com/interactive/coding-tutorial.html",
        mediaTitle: "Advanced React Patterns",
        mediaType: MediaType.INTERACTIVE,
        mediaDurationSeconds: 7200, // 2 hours
        minimumEngagementSeconds: 5400, // 1.5 hours (75%)
        minimumCompletionPercentage: 0.8,
        requireFullCompletion: false,
        allowPausing: true,
        maxPauseTimeSeconds: 900, // 15 minutes total pause time
        unlocked: false,
        totalEngagementSeconds: 0,
        completionPercentage: 0,
      },
      {
        title: "Research Paper Collection",
        content: "Access to the complete research dataset and methodology notes.",
        userId: "seed-user-2",
        mediaUrl: "https://example.com/documents/climate-research.pdf",
        mediaTitle: "Climate Change Impact Studies 2024",
        mediaType: MediaType.DOCUMENT,
        mediaDurationSeconds: 3600, // 1 hour estimated reading time
        minimumEngagementSeconds: 2700, // 45 minutes (75%)
        minimumCompletionPercentage: 0.9,
        requireFullCompletion: false,
        allowPausing: true,
        maxPauseTimeSeconds: 1800, // 30 minutes total pause time (reading breaks)
        unlocked: false,
        totalEngagementSeconds: 0,
        completionPercentage: 0,
      },
      {
        title: "Masterclass Video Series",
        content: "Exclusive Q&A session recording and downloadable practice materials.",
        userId: "seed-user-1",
        mediaUrl: "https://example.com/videos/photography-masterclass.mp4",
        mediaTitle: "Portrait Photography Techniques",
        mediaType: MediaType.VIDEO,
        mediaDurationSeconds: 4800, // 80 minutes
        minimumEngagementSeconds: 4320, // 72 minutes (90%)
        minimumCompletionPercentage: 0.9,
        requireFullCompletion: false,
        allowPausing: false, // No pausing allowed for this intensive session
        maxPauseTimeSeconds: 0,
        unlocked: false,
        totalEngagementSeconds: 0,
        completionPercentage: 0,
      },
      {
        title: "Audio Book Chapter",
        content: "Author's notes, deleted scenes, and character development insights.",
        userId: "seed-user-2",
        mediaUrl: "https://example.com/audio/mystery-novel-ch1.mp3",
        mediaTitle: "The Midnight Detective - Chapter 1",
        mediaType: MediaType.AUDIO,
        mediaDurationSeconds: 1800, // 30 minutes
        minimumEngagementSeconds: 1620, // 27 minutes (90%)
        minimumCompletionPercentage: 1.0, // Must listen to the entire chapter
        requireFullCompletion: true,
        allowPausing: true,
        maxPauseTimeSeconds: 180, // 3 minutes total pause time
        unlocked: false,
        totalEngagementSeconds: 0,
        completionPercentage: 0,
      },
    ]

    // Save all capsules
    await this.archiveCapsuleRepository.save(capsules)

    console.log("Archive capsule seed data created successfully")
  }
}
