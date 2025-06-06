import { Injectable, NotFoundException, ConflictException } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { CountdownCapsule } from "./entities/countdown-capsule.entity"
import type { CreateCountdownCapsuleDto } from "./dto/create-countdown-capsule.dto"
import type { StartCountdownDto } from "./dto/start-countdown.dto"
import type { CountdownCapsuleResponseDto } from "./dto/countdown-capsule-response.dto"

@Injectable()
export class CountdownCapsuleService {
  constructor(private readonly countdownCapsuleRepository: Repository<CountdownCapsule>) {}

  async create(createCountdownCapsuleDto: CreateCountdownCapsuleDto): Promise<CountdownCapsuleResponseDto> {
    const capsule = this.countdownCapsuleRepository.create(createCountdownCapsuleDto)

    const savedCapsule = await this.countdownCapsuleRepository.save(capsule)
    return this.mapToResponseDto(savedCapsule)
  }

  async start(startCountdownDto: StartCountdownDto): Promise<CountdownCapsuleResponseDto> {
    const { capsuleId } = startCountdownDto

    const capsule = await this.countdownCapsuleRepository.findOne({
      where: { id: capsuleId },
    })

    if (!capsule) {
      throw new NotFoundException(`Countdown capsule with ID ${capsuleId} not found`)
    }

    if (capsule.started) {
      throw new ConflictException("Countdown capsule has already been started")
    }

    // Calculate unlock time
    const now = new Date()
    const unlockAt = new Date(now.getTime() + capsule.durationMinutes * 60 * 1000)

    // Update capsule
    capsule.started = true
    capsule.unlockAt = unlockAt

    const updatedCapsule = await this.countdownCapsuleRepository.save(capsule)
    return this.mapToResponseDto(updatedCapsule)
  }

  async view(capsuleId: string): Promise<CountdownCapsuleResponseDto> {
    const capsule = await this.countdownCapsuleRepository.findOne({
      where: { id: capsuleId },
    })

    if (!capsule) {
      throw new NotFoundException(`Countdown capsule with ID ${capsuleId} not found`)
    }

    // Check if capsule should be unlocked
    if (capsule.started && !capsule.unlocked && capsule.isExpired) {
      capsule.unlocked = true
      await this.countdownCapsuleRepository.save(capsule)
    }

    return this.mapToResponseDto(capsule)
  }

  async findAll(): Promise<CountdownCapsuleResponseDto[]> {
    const capsules = await this.countdownCapsuleRepository.find({
      order: { createdAt: "DESC" },
    })

    return capsules.map((capsule) => this.mapToResponseDto(capsule))
  }

  async findByCreator(createdBy: string): Promise<CountdownCapsuleResponseDto[]> {
    const capsules = await this.countdownCapsuleRepository.find({
      where: { createdBy },
      order: { createdAt: "DESC" },
    })

    return capsules.map((capsule) => this.mapToResponseDto(capsule))
  }

  private mapToResponseDto(capsule: CountdownCapsule): CountdownCapsuleResponseDto {
    return {
      id: capsule.id,
      title: capsule.title,
      content: capsule.unlocked || capsule.isExpired ? capsule.content : undefined,
      durationMinutes: capsule.durationMinutes,
      unlockAt: capsule.unlockAt,
      createdAt: capsule.createdAt,
      started: capsule.started,
      unlocked: capsule.unlocked || capsule.isExpired,
      isExpired: capsule.isExpired,
      remainingTime: capsule.remainingTime,
      createdBy: capsule.createdBy,
    }
  }
}
