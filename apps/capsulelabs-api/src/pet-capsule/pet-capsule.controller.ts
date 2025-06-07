import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiParam, ApiQuery } from "@nestjs/swagger"
import type { Response } from "express"
import type { Repository } from "typeorm"
import type { PetUpload } from "./entities/pet-upload.entity"
import type { ImageProcessingService } from "./services/image-processing.service"
import type { PetVerificationService } from "./services/pet-verification.service"
import type { MLClassifierService } from "./services/ml-classifier.service"
import type { PetUploadDto, ManualVerificationDto } from "./dto/pet-upload.dto"
import { VerificationStatus } from "./dto/pet-upload.dto"
import * as path from "path"

@ApiTags("Pet Capsule")
@Controller("pet-capsule")
// @UseGuards(JwtAuthGuard) // Uncomment when you have auth setup
export class PetCapsuleController {
  constructor(
    private uploadRepository: Repository<PetUpload>,
    private imageProcessingService: ImageProcessingService,
    private petVerificationService: PetVerificationService,
    private mlClassifierService: MLClassifierService,
  ) {}

  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Upload a pet photo for verification" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 201, description: "Photo uploaded and processing started" })
  @ApiResponse({ status: 400, description: "Invalid file or upload error" })
  @UseInterceptors(FileInterceptor("photo"))
  async uploadPetPhoto(req: any, @UploadedFile() file: Express.Multer.File, @Body() uploadDto: PetUploadDto) {
    const userId = req.user?.id || "demo-user"

    if (!file) {
      throw new BadRequestException("No photo file provided")
    }

    try {
      // Process the uploaded image
      const processedImage = await this.imageProcessingService.processUpload(file)

      // Create upload record
      const upload = this.uploadRepository.create({
        userId,
        originalFileName: processedImage.originalFileName,
        storedFileName: processedImage.storedFileName,
        filePath: processedImage.filePath,
        mimeType: processedImage.mimeType,
        fileSize: processedImage.fileSize,
        imageWidth: processedImage.imageWidth,
        imageHeight: processedImage.imageHeight,
        petName: uploadDto.petName,
        expectedPetType: uploadDto.expectedPetType,
        description: uploadDto.description,
        tags: uploadDto.tags,
        metadata: {
          uploadSource: "web",
          deviceInfo: req.headers["user-agent"],
          ipAddress: req.ip,
        },
      })

      await this.uploadRepository.save(upload)

      // Process with ML classifier
      const verificationResult = await this.petVerificationService.processUpload(
        upload,
        processedImage.processedImagePath,
      )

      return {
        success: true,
        data: {
          uploadId: upload.id,
          verificationStatus: upload.verificationStatus,
          needsManualReview: verificationResult.needsManualReview,
          capsuleUnlocked: verificationResult.capsuleUnlocked,
          classification: {
            predictedPetType: verificationResult.classification.predictedPetType,
            confidence: verificationResult.classification.confidence,
            modelProvider: verificationResult.classification.modelProvider,
          },
          imageUrl: this.imageProcessingService.getImageUrl(upload.storedFileName),
        },
        message: verificationResult.capsuleUnlocked
          ? "🎉 Congratulations! Your pet photo has been verified and the Pet Capsule is unlocked!"
          : verificationResult.needsManualReview
            ? "Your photo is being reviewed by our team. You'll be notified once complete!"
            : "Photo uploaded successfully and is being processed!",
      }
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`)
    }
  }

  @Get("uploads")
  @ApiOperation({ summary: "Get user's pet photo uploads" })
  @ApiQuery({ name: "limit", required: false, description: "Number of uploads to return" })
  @ApiQuery({ name: "offset", required: false, description: "Number of uploads to skip" })
  @ApiResponse({ status: 200, description: "User uploads retrieved successfully" })
  async getUserUploads(req: any, @Query("limit") limit?: string, @Query("offset") offset?: string) {
    const userId = req.user?.id || "demo-user"
    const limitNum = limit ? Number.parseInt(limit) : 20
    const offsetNum = offset ? Number.parseInt(offset) : 0

    const result = await this.petVerificationService.getUserUploads(userId, limitNum, offsetNum)

    return {
      success: true,
      data: {
        ...result,
        uploads: result.uploads.map((upload) => ({
          ...upload,
          imageUrl: this.imageProcessingService.getImageUrl(upload.storedFileName),
        })),
      },
    }
  }

  @Get("upload/:id")
  @ApiOperation({ summary: "Get detailed information about a specific upload" })
  @ApiParam({ name: "id", description: "Upload ID" })
  @ApiResponse({ status: 200, description: "Upload details retrieved successfully" })
  @ApiResponse({ status: 404, description: "Upload not found" })
  async getUploadDetails(req: any, @Param("id") uploadId: string) {
    const userId = req.user?.id || "demo-user"

    const details = await this.petVerificationService.getUploadWithDetails(uploadId)

    // Verify user owns this upload (or is admin)
    if (details.upload.userId !== userId) {
      throw new BadRequestException("Access denied")
    }

    return {
      success: true,
      data: {
        ...details,
        upload: {
          ...details.upload,
          imageUrl: this.imageProcessingService.getImageUrl(details.upload.storedFileName),
        },
      },
    }
  }

  @Get("images/:filename")
  @ApiOperation({ summary: "Serve uploaded pet images" })
  @ApiParam({ name: "filename", description: "Image filename" })
  async serveImage(@Param("filename") filename: string, @Res() res: Response) {
    try {
      const imagePath = `./uploads/pets/${filename}`
      const imageBuffer = await this.imageProcessingService.getImageBuffer(imagePath)

      // Set appropriate headers
      res.setHeader("Content-Type", "image/jpeg")
      res.setHeader("Cache-Control", "public, max-age=31536000") // 1 year cache
      res.send(imageBuffer)
    } catch (error) {
      res.status(404).json({ error: "Image not found" })
    }
  }

  @Get("status")
  @ApiOperation({ summary: "Get user's pet capsule status" })
  @ApiResponse({ status: 200, description: "Capsule status retrieved successfully" })
  async getCapsuleStatus(req: any) {
    const userId = req.user?.id || "demo-user"

    const userUploads = await this.petVerificationService.getUserUploads(userId, 1, 0)

    return {
      success: true,
      data: {
        hasUnlockedCapsule: userUploads.hasUnlock,
        totalUploads: userUploads.total,
        latestUpload: userUploads.uploads[0] || null,
        canUpload: !userUploads.hasUnlock, // Can only upload if capsule not unlocked
      },
    }
  }

  @Post("verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Perform manual verification (admin/reviewer only)" })
  @ApiResponse({ status: 200, description: "Manual verification completed" })
  @ApiResponse({ status: 400, description: "Invalid verification data" })
  async performManualVerification(req: any, @Body() verificationDto: ManualVerificationDto) {
    const reviewerId = req.user?.id || "admin-user"

    const result = await this.petVerificationService.performManualVerification(
      verificationDto.uploadId,
      reviewerId,
      verificationDto.status,
      verificationDto.reviewNotes,
      verificationDto.correctedPetType,
      verificationDto.confidenceOverride,
    )

    return {
      success: true,
      data: {
        verification: result.verification,
        capsuleUnlocked: result.capsuleUnlocked,
      },
      message: result.capsuleUnlocked
        ? "Photo approved and capsule unlocked!"
        : `Photo ${verificationDto.status.toLowerCase()} successfully`,
    }
  }

  @Get("pending-reviews")
  @ApiOperation({ summary: "Get photos pending manual review (admin/reviewer only)" })
  @ApiQuery({ name: "limit", required: false, description: "Number of reviews to return" })
  @ApiResponse({ status: 200, description: "Pending reviews retrieved successfully" })
  async getPendingReviews(@Query("limit") limit?: string) {
    const limitNum = limit ? Number.parseInt(limit) : 50

    const result = await this.petVerificationService.getPendingReviews(limitNum)

    return {
      success: true,
      data: {
        ...result,
        uploads: result.uploads.map((item) => ({
          ...item,
          upload: {
            ...item.upload,
            imageUrl: this.imageProcessingService.getImageUrl(item.upload.storedFileName),
          },
        })),
      },
    }
  }

  @Get("stats")
  @ApiOperation({ summary: "Get verification statistics (admin only)" })
  @ApiResponse({ status: 200, description: "Statistics retrieved successfully" })
  async getVerificationStats() {
    const stats = await this.petVerificationService.getVerificationStats()
    const imageStats = await this.imageProcessingService.getImageStats()
    const modelInfo = await this.mlClassifierService.getModelInfo()

    return {
      success: true,
      data: {
        verification: stats,
        images: imageStats,
        model: modelInfo,
      },
    }
  }

  @Get("supported-pets")
  @ApiOperation({ summary: "Get list of supported pet types" })
  @ApiResponse({ status: 200, description: "Supported pet types retrieved successfully" })
  async getSupportedPetTypes() {
    const modelInfo = await this.mlClassifierService.getModelInfo()

    return {
      success: true,
      data: {
        supportedPetTypes: modelInfo.supportedPetTypes,
        confidenceThreshold: modelInfo.confidenceThreshold,
        modelVersion: modelInfo.modelVersion,
        examples: {
          dog: ["Golden Retriever", "Labrador", "German Shepherd", "Bulldog"],
          cat: ["Persian", "Siamese", "Maine Coon", "British Shorthair"],
          bird: ["Parrot", "Canary", "Budgie", "Cockatiel"],
          rabbit: ["Holland Lop", "Netherland Dwarf", "Angora"],
          hamster: ["Syrian", "Dwarf", "Roborovski"],
          fish: ["Goldfish", "Betta", "Guppy", "Angelfish"],
          reptile: ["Gecko", "Iguana", "Bearded Dragon", "Snake"],
        },
      },
    }
  }

  @Post("reprocess/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reprocess an upload with ML classifier (admin only)" })
  @ApiParam({ name: "id", description: "Upload ID" })
  @ApiResponse({ status: 200, description: "Upload reprocessed successfully" })
  async reprocessUpload(@Param("id") uploadId: string) {
    const details = await this.petVerificationService.getUploadWithDetails(uploadId)

    if (!details.upload) {
      throw new BadRequestException("Upload not found")
    }

    // Reset verification status
    details.upload.verificationStatus = VerificationStatus.PENDING
    await this.uploadRepository.save(details.upload)

    // Reprocess with ML
    const processedImagePath = details.upload.filePath.replace(
      path.basename(details.upload.filePath),
      `processed-${details.upload.storedFileName}`,
    )

    const result = await this.petVerificationService.processUpload(details.upload, processedImagePath)

    return {
      success: true,
      data: {
        classification: result.classification,
        needsManualReview: result.needsManualReview,
        capsuleUnlocked: result.capsuleUnlocked,
      },
      message: "Upload reprocessed successfully",
    }
  }

  @Post("model/reload")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reload ML model (admin only)" })
  @ApiResponse({ status: 200, description: "Model reloaded successfully" })
  async reloadModel() {
    await this.mlClassifierService.reloadModel()

    const modelInfo = await this.mlClassifierService.getModelInfo()

    return {
      success: true,
      data: { modelInfo },
      message: "ML model reloaded successfully",
    }
  }
}
