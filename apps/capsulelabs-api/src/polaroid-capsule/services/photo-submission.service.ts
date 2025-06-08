import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { PhotoSubmission, SubmissionStatus } from "../entities/photo-submission.entity"
import type { SubmitPhotoDto } from "../dto/submit-photo.dto"
import type { ReviewPhotoDto } from "../dto/review-photo.dto"
import type { ThemeService } from "./theme.service"
import type { ObjectDetectionService } from "./object-detection.service"

@Injectable()
export class PhotoSubmissionService {
  constructor(
    @InjectRepository(PhotoSubmission)
    private photoSubmissionRepository: Repository<PhotoSubmission>,
    private themeService: ThemeService,
    private objectDetectionService: ObjectDetectionService,
  ) {}

  async submitPhoto(userId: string, submitPhotoDto: SubmitPhotoDto): Promise<PhotoSubmission> {
    // Get today's theme for the user
    const dailyTheme = await this.themeService.getDailyTheme(userId)

    // Check if user already submitted a photo today
    const existingSubmission = await this.getTodaysSubmission(userId)
    if (existingSubmission) {
      throw new BadRequestException("You have already submitted a photo today")
    }

    // Get today's date
    const today = new Date()
    const submissionDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // Create submission
    const submission = this.photoSubmissionRepository.create({
      userId,
      dailyThemeId: dailyTheme.id,
      photoUrl: submitPhotoDto.photoUrl,
      thumbnailUrl: submitPhotoDto.thumbnailUrl,
      caption: submitPhotoDto.caption,
      metadata: submitPhotoDto.metadata,
      submissionDate,
    })

    // If the photo URL is available, perform object detection
    if (submission.photoUrl) {
      try {
        const detectionResults = await this.objectDetectionService.detectObjects(submission.photoUrl)
        submission.detectionResults = detectionResults

        // Match detected objects with theme keywords
        const matchResult = this.objectDetectionService.matchImageToTheme(
          {
            labels: detectionResults.labels,
            colors: detectionResults.colors,
          },
          dailyTheme.theme.keywords,
        )

        submission.confidenceScore = matchResult.confidence

        // Auto-approve if confidence is high enough (this threshold can be configurable)
        if (matchResult.confidence >= 0.7) {
          submission.status = SubmissionStatus.APPROVED
          submission.reviewedAt = new Date()
          submission.reviewedBy = "system"
        }
      } catch (error) {
        console.error("Error during object detection:", error)
        // Continue with submission even if object detection fails
      }
    }

    return await this.photoSubmissionRepository.save(submission)
  }

  async reviewSubmission(submissionId: string, reviewDto: ReviewPhotoDto): Promise<PhotoSubmission> {
    const submission = await this.photoSubmissionRepository.findOne({
      where: { id: submissionId },
    })

    if (!submission) {
      throw new NotFoundException("Photo submission not found")
    }

    submission.status = reviewDto.status
    submission.rejectionReason = reviewDto.rejectionReason
    submission.reviewedBy = reviewDto.reviewedBy
    submission.reviewedAt = new Date()

    if (reviewDto.metadata) {
      submission.metadata = { ...submission.metadata, ...reviewDto.metadata }
    }

    return await this.photoSubmissionRepository.save(submission)
  }

  async getSubmissionById(id: string): Promise<PhotoSubmission> {
    const submission = await this.photoSubmissionRepository.findOne({
      where: { id },
      relations: ["dailyTheme", "dailyTheme.theme"],
    })

    if (!submission) {
      throw new NotFoundException("Photo submission not found")
    }

    return submission
  }

  async getUserSubmissions(userId: string, limit = 30): Promise<PhotoSubmission[]> {
    return await this.photoSubmissionRepository.find({
      where: { userId },
      relations: ["dailyTheme", "dailyTheme.theme"],
      order: { submittedAt: "DESC" },
      take: limit,
    })
  }

  async getTodaysSubmission(userId: string): Promise<PhotoSubmission | null> {
    const today = new Date()
    const submissionDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    return await this.photoSubmissionRepository.findOne({
      where: {
        userId,
        submissionDate,
      },
      relations: ["dailyTheme", "dailyTheme.theme"],
    })
  }

  async getPendingSubmissions(limit = 50): Promise<PhotoSubmission[]> {
    return await this.photoSubmissionRepository.find({
      where: { status: SubmissionStatus.PENDING },
      relations: ["dailyTheme", "dailyTheme.theme"],
      order: { submittedAt: "ASC" },
      take: limit,
    })
  }
}
