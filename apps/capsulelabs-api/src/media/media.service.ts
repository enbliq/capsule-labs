import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"
import * as mime from "mime-types"

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name)
  private readonly s3Client: S3Client
  private readonly useS3: boolean
  private readonly bucketName: string
  private readonly uploadDir: string

  constructor(private configService: ConfigService) {
    this.useS3 = this.configService.get<string>("STORAGE_TYPE") === "s3"

    if (this.useS3) {
      this.bucketName = this.configService.get<string>("AWS_S3_BUCKET_NAME")
      this.s3Client = new S3Client({
        region: this.configService.get<string>("AWS_REGION"),
        credentials: {
          accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID"),
          secretAccessKey: this.configService.get<string>("AWS_SECRET_ACCESS_KEY"),
        },
      })
    } else {
      // Local file storage
      this.uploadDir = this.configService.get<string>("UPLOAD_DIR") || "uploads"
      // Ensure upload directory exists
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true })
      }
    }
  }

  async getUploadUrl(filename: string, filetype: string): Promise<{ url: string; mediaUrl: string }> {
    if (this.useS3) {
      return this.getS3SignedUrl(filename, filetype)
    } else {
      return this.getLocalUploadUrl(filename, filetype)
    }
  }

  private async getS3SignedUrl(filename: string, filetype: string): Promise<{ url: string; mediaUrl: string }> {
    try {
      const fileKey = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${filename}`

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: filetype,
      })

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 })
      const mediaUrl = `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`

      return { url: signedUrl, mediaUrl }
    } catch (error) {
      this.logger.error(`Error generating S3 signed URL: ${error.message}`)
      throw error
    }
  }

  private async getLocalUploadUrl(filename: string, filetype: string): Promise<{ url: string; mediaUrl: string }> {
    try {
      const fileExtension = mime.extension(filetype) || path.extname(filename).slice(1)
      const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${fileExtension}`
      const filePath = path.join(this.uploadDir, uniqueFilename)

      // For local storage, we return the path where the file should be uploaded
      // The actual upload will happen in the controller using multer
      const baseUrl = this.configService.get<string>("BASE_URL") || "http://localhost:3000"
      const mediaUrl = `${baseUrl}/uploads/${uniqueFilename}`

      return {
        url: `/media/upload/local?filename=${uniqueFilename}`,
        mediaUrl,
      }
    } catch (error) {
      this.logger.error(`Error generating local upload URL: ${error.message}`)
      throw error
    }
  }
}
