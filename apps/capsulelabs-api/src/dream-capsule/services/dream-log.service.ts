import { Injectable, BadRequestException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { DreamLog } from "../entities/dream-log.entity"
import type { LogDreamDto } from "../dto/log-dream.dto"
import type { DreamValidationService } from "./dream-validation.service"

@Injectable()
export class DreamLogService {
  constructor(
    @InjectRepository(DreamLog)
    private dreamLogRepository: Repository<DreamLog>,
    private dreamValidationService: DreamValidationService,
  ) {}

  async logDream(userId: string, logDreamDto: LogDreamDto): Promise<DreamLog> {
    const { content, title, clarity, emotion, isLucid, timezone = "UTC", metadata } = logDreamDto

    // Count words in the dream content
    const wordCount = this.dreamValidationService.countWords(content)

    if (wordCount === 0) {
      throw new BadRequestException("Dream content cannot be empty")
    }

    // Check if the dream is logged before the cutoff time (9 AM by default)
    const isBeforeCutoff = this.dreamValidationService.isBeforeCutoff("09:00:00", timezone)

    // Get today's date in the user's timezone
    const today = this.getTodayInTimezone(timezone)

    // Check if user already logged a dream today
    const existingLog = await this.dreamLogRepository.findOne({
      where: {
        userId,
        logDate: today,
      },
    })

    if (existingLog) {
      throw new BadRequestException("You have already logged a dream today")
    }

    // Create new dream log
    const dreamLog = this.dreamLogRepository.create({
      userId,
      content,
      wordCount,
      title,
      clarity,
      emotion,
      isLucid,
      timezone,
      isBeforeCutoff,
      metadata,
      logDate: today,
    })

    return await this.dreamLogRepository.save(dreamLog)
  }

  async getDreamLogById(id: string, userId: string): Promise<DreamLog> {
    const dreamLog = await this.dreamLogRepository.findOne({
      where: { id, userId },
    })

    if (!dreamLog) {
      throw new BadRequestException("Dream log not found")
    }

    return dreamLog
  }

  async getUserDreamLogs(userId: string, limit = 30): Promise<DreamLog[]> {
    return await this.dreamLogRepository.find({
      where: { userId },
      order: { logDate: "DESC" },
      take: limit,
    })
  }

  async getTodaysDreamLog(userId: string, timezone = "UTC"): Promise<DreamLog | null> {
    const today = this.getTodayInTimezone(timezone)

    return await this.dreamLogRepository.findOne({
      where: {
        userId,
        logDate: today,
      },
    })
  }

  async getDreamLogsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<DreamLog[]> {
    return await this.dreamLogRepository.find({
      where: {
        userId,
        logDate: Between(startDate, endDate),
      },
      order: { logDate: "ASC" },
    })
  }

  private getTodayInTimezone(timezone: string): Date {
    const now = new Date()

    // Get just the date part (year, month, day)
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
}

import { Between } from "typeorm"
