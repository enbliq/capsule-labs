import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, ParseIntPipe, ValidationPipe } from "@nestjs/common"
import type { PhotoSubmissionService } from "../services/photo-submission.service"
import type { PolaroidCapsuleService } from "../services/polaroid-capsule.service"
import type { ReviewPhotoDto } from "../dto/review-photo.dto"
import type { PhotoSubmission } from "../entities/photo-submission.entity"

// Note: You'll need to implement your own authentication guard
// import { AuthGuard } from '@nestjs/passport';
// import { GetUser } from '../auth/get-user.decorator';

@Controller("photo-submissions")
// @UseGuards(AuthGuard())
export class PhotoSubmissionController {
  constructor(
    private readonly photoSubmissionService: PhotoSubmissionService,
    private readonly polaroidCapsuleService: PolaroidCapsuleService,
  ) {}

  @Get(":id")
  async getSubmissionById(@Param('id') id: string): Promise<PhotoSubmission> {
    return await this.photoSubmissionService.getSubmissionById(id)
  }

  @Get("user/:userId")
  async getUserSubmissions(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PhotoSubmission[]> {
    return await this.photoSubmissionService.getUserSubmissions(userId, limit)
  }

  @Get("today/:userId")
  async getTodaysSubmission(@Param('userId', ParseUUIDPipe) userId: string): Promise<PhotoSubmission | null> {
    return await this.photoSubmissionService.getTodaysSubmission(userId)
  }

  @Get("pending")
  // @UseGuards(AdminGuard) // Restrict to admins/reviewers
  async getPendingSubmissions(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PhotoSubmission[]> {
    return await this.photoSubmissionService.getPendingSubmissions(limit)
  }

  @Post(":id/review")
  // @UseGuards(AdminGuard) // Restrict to admins/reviewers
  async reviewSubmission(
    @Param('id') submissionId: string,
    @Body(ValidationPipe) reviewDto: ReviewPhotoDto,
  ): Promise<{ submission: PhotoSubmission; unlockedCapsules: any[] }> {
    return await this.polaroidCapsuleService.reviewSubmission(
      submissionId,
      reviewDto.status,
      reviewDto.reviewedBy,
      reviewDto.rejectionReason,
    )
  }
}
