import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { HeartbeatCapsule } from "./entities/heartbeat-capsule.entity"
import type { BpmSubmission } from "./entities/bpm-submission.entity"
import type { CreateHeartbeatCapsuleDto } from "./dto/create-heartbeat-capsule.dto"
import type { SubmitBpmDto } from "./dto/submit-bpm.dto"
import type { ViewHeartbeatCapsuleDto } from "./dto/view-heartbeat-capsule.dto"

@Injectable()
export class HeartbeatCapsuleService {
  constructor(
    private readonly heartbeatCapsuleRepository: Repository<HeartbeatCapsule>,
    private readonly bpmSubmissionRepository: Repository<BpmSubmission>,
  ) {}

  async create(createHeartbeatCapsuleDto: CreateHeartbeatCapsuleDto, userId: string): Promise<HeartbeatCapsule> {
    // Validate that min BPM is less than max BPM
    if (createHeartbeatCapsuleDto.targetMinBpm > createHeartbeatCapsuleDto.targetMaxBpm) {
      throw new Error("Minimum BPM must be less than or equal to maximum BPM")
    }

    const capsule = this.heartbeatCapsuleRepository.create({
      ...createHeartbeatCapsuleDto,
      userId,
    })

    return this.heartbeatCapsuleRepository.save(capsule)
  }

  async findOne(id: string): Promise<HeartbeatCapsule> {
    const capsule = await this.heartbeatCapsuleRepository.findOne({ where: { id } })

    if (!capsule) {
      throw new NotFoundException(`Heartbeat capsule with ID ${id} not found`)
    }

    return capsule
  }

  async findAll(userId: string): Promise<HeartbeatCapsule[]> {
    return this.heartbeatCapsuleRepository.find({
      where: { userId },
    })
  }

  async unlockCapsule(id: string, submitBpmDto: SubmitBpmDto, userId: string): Promise<ViewHeartbeatCapsuleDto> {
    const capsule = await this.findOne(id)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule")
    }

    const { bpm } = submitBpmDto
    const isWithinRange = bpm >= capsule.targetMinBpm && bpm <= capsule.targetMaxBpm

    // Log the BPM submission
    await this.logBpmSubmission(capsule.id, userId, bpm, isWithinRange)

    // Create the response DTO
    const response: ViewHeartbeatCapsuleDto = {
      id: capsule.id,
      title: capsule.title,
      isLocked: !isWithinRange,
      targetMinBpm: capsule.targetMinBpm,
      targetMaxBpm: capsule.targetMaxBpm,
      submittedBpm: bpm,
      createdAt: capsule.createdAt,
      updatedAt: capsule.updatedAt,
    }

    // Only include content if BPM is within range
    if (isWithinRange) {
      response.content = capsule.content
    }

    return response
  }

  private async logBpmSubmission(capsuleId: string, userId: string, bpm: number, successful: boolean): Promise<void> {
    const submission = this.bpmSubmissionRepository.create({
      capsuleId,
      userId,
      bpm,
      successful,
    })

    await this.bpmSubmissionRepository.save(submission)
  }

  async getSubmissionHistory(capsuleId: string, userId: string): Promise<BpmSubmission[]> {
    const capsule = await this.findOne(capsuleId)

    // Check if the user is the owner of the capsule
    if (capsule.userId !== userId) {
      throw new Error("You don't have permission to access this capsule's history")
    }

    return this.bpmSubmissionRepository.find({
      where: { capsuleId },
      order: { createdAt: "DESC" },
    })
  }
}
