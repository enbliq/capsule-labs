import { ApiProperty } from "@nestjs/swagger"
import { MediaType } from "../entities/archive-capsule.entity"

export class MediaRequirementsDto {
  @ApiProperty({ enum: MediaType })
  mediaType: MediaType

  @ApiProperty()
  mediaDurationSeconds: number

  @ApiProperty()
  minimumEngagementSeconds: number

  @ApiProperty()
  minimumCompletionPercentage: number

  @ApiProperty()
  requireFullCompletion: boolean

  @ApiProperty()
  allowPausing: boolean

  @ApiProperty()
  maxPauseTimeSeconds: number
}

export class MediaProgressDto {
  @ApiProperty()
  totalEngagementSeconds: number

  @ApiProperty()
  completionPercentage: number

  @ApiProperty()
  requirementsMet: boolean

  @ApiProperty()
  remainingSeconds: number

  @ApiProperty()
  remainingPercentage: number
}

export class ViewArchiveCapsuleDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiProperty({ required: false })
  content?: string

  @ApiProperty()
  unlocked: boolean

  @ApiProperty()
  mediaUrl: string

  @ApiProperty()
  mediaTitle: string

  @ApiProperty({ type: MediaRequirementsDto })
  requirements: MediaRequirementsDto

  @ApiProperty({ type: MediaProgressDto })
  progress: MediaProgressDto

  @ApiProperty({ required: false })
  unlockedAt?: Date

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
