import { Injectable, Logger, BadRequestException } from "@nestjs/common"
import { promises as fs } from "fs"
import * as path from "path"
import * as sharp from "sharp"
import * as crypto from "crypto"
import type { Express } from "express"

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name)
  private readonly uploadDir = process.env.UPLOAD_DIR || "./uploads/pets"
  private readonly maxFileSize = 10 * 1024 * 1024 // 10MB
  private readonly allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"]

  constructor() {
    this.ensureUploadDirectory()
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir)
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true })
      this.logger.log(`Created upload directory: ${this.uploadDir}`)
    }
  }

  async processUpload(file: Express.Multer.File): Promise<{
    originalFileName: string
    storedFileName: string
    filePath: string
    mimeType: string
    fileSize: number
    imageWidth: number
    imageHeight: number
    processedImagePath: string
  }> {
    // Validate file
    this.validateFile(file)

    // Generate unique filename
    const fileExtension = path.extname(file.originalname).toLowerCase()
    const hash = crypto.randomBytes(16).toString("hex")
    const storedFileName = `${Date.now()}-${hash}${fileExtension}`
    const filePath = path.join(this.uploadDir, storedFileName)

    try {
      // Process and save image
      const imageBuffer = await this.processImage(file.buffer)
      await fs.writeFile(filePath, imageBuffer)

      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata()

      // Create processed version for ML (standardized size)
      const processedFileName = `processed-${storedFileName}`
      const processedImagePath = path.join(this.uploadDir, processedFileName)

      const processedBuffer = await sharp(file.buffer)
        .resize(224, 224, { fit: "cover" }) // Standard ML input size
        .jpeg({ quality: 90 })
        .toBuffer()

      await fs.writeFile(processedImagePath, processedBuffer)

      this.logger.log(`Processed image upload: ${file.originalname} -> ${storedFileName}`)

      return {
        originalFileName: file.originalname,
        storedFileName,
        filePath,
        mimeType: file.mimetype,
        fileSize: file.size,
        imageWidth: metadata.width || 0,
        imageHeight: metadata.height || 0,
        processedImagePath,
      }
    } catch (error) {
      this.logger.error(`Error processing image upload:`, error)
      throw new BadRequestException("Failed to process image")
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException("No file provided")
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds limit of ${this.maxFileSize / (1024 * 1024)}MB`)
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type. Allowed: ${this.allowedMimeTypes.join(", ")}`)
    }

    // Basic file header validation
    if (!this.isValidImageHeader(file.buffer)) {
      throw new BadRequestException("Invalid image file")
    }
  }

  private isValidImageHeader(buffer: Buffer): boolean {
    // Check for common image file signatures
    const signatures = [
      [0xff, 0xd8, 0xff], // JPEG
      [0x89, 0x50, 0x4e, 0x47], // PNG
      [0x52, 0x49, 0x46, 0x46], // WebP (RIFF)
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // HEIC
    ]

    return signatures.some((signature) => {
      return signature.every((byte, index) => buffer[index] === byte)
    })
  }

  private async processImage(buffer: Buffer): Promise<Buffer> {
    try {
      // Process image: auto-orient, optimize, and ensure reasonable size
      return await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF
        .resize(1920, 1920, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toBuffer()
    } catch (error) {
      this.logger.error("Error processing image with Sharp:", error)
      throw new BadRequestException("Failed to process image")
    }
  }

  async getImageBuffer(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath)
    } catch (error) {
      this.logger.error(`Error reading image file ${filePath}:`, error)
      throw new BadRequestException("Image file not found")
    }
  }

  async deleteImage(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)

      // Also delete processed version if it exists
      const processedPath = path.join(path.dirname(filePath), `processed-${path.basename(filePath)}`)

      try {
        await fs.unlink(processedPath)
      } catch {
        // Ignore if processed file doesn't exist
      }

      this.logger.log(`Deleted image file: ${filePath}`)
    } catch (error) {
      this.logger.error(`Error deleting image file ${filePath}:`, error)
    }
  }

  async createThumbnail(originalPath: string, size = 150): Promise<string> {
    try {
      const thumbnailPath = originalPath.replace(
        path.extname(originalPath),
        `_thumb_${size}${path.extname(originalPath)}`,
      )

      await sharp(originalPath).resize(size, size, { fit: "cover" }).jpeg({ quality: 80 }).toFile(thumbnailPath)

      return thumbnailPath
    } catch (error) {
      this.logger.error("Error creating thumbnail:", error)
      throw new BadRequestException("Failed to create thumbnail")
    }
  }

  getImageUrl(storedFileName: string): string {
    // In production, this would return a CDN URL or signed URL
    return `/api/pet-capsule/images/${storedFileName}`
  }

  async getImageStats(): Promise<{
    totalImages: number
    totalSizeBytes: number
    averageSizeBytes: number
    oldestImage: Date | null
    newestImage: Date | null
  }> {
    try {
      const files = await fs.readdir(this.uploadDir)
      const imageFiles = files.filter((file) => !file.startsWith("processed-") && !file.includes("_thumb_"))

      if (imageFiles.length === 0) {
        return {
          totalImages: 0,
          totalSizeBytes: 0,
          averageSizeBytes: 0,
          oldestImage: null,
          newestImage: null,
        }
      }

      let totalSize = 0
      let oldestTime = Number.MAX_SAFE_INTEGER
      let newestTime = 0

      for (const file of imageFiles) {
        const filePath = path.join(this.uploadDir, file)
        const stats = await fs.stat(filePath)

        totalSize += stats.size
        oldestTime = Math.min(oldestTime, stats.birthtimeMs)
        newestTime = Math.max(newestTime, stats.birthtimeMs)
      }

      return {
        totalImages: imageFiles.length,
        totalSizeBytes: totalSize,
        averageSizeBytes: Math.round(totalSize / imageFiles.length),
        oldestImage: new Date(oldestTime),
        newestImage: new Date(newestTime),
      }
    } catch (error) {
      this.logger.error("Error getting image stats:", error)
      return {
        totalImages: 0,
        totalSizeBytes: 0,
        averageSizeBytes: 0,
        oldestImage: null,
        newestImage: null,
      }
    }
  }
}
