import { Controller, Post, Body, UseInterceptors, UploadedFile, Query, BadRequestException } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { diskStorage } from "multer"
import type { MediaService } from "./media.service"
import type { UploadRequestDto } from "./dto/upload-request.dto"
import type { UploadResponseDto } from "./dto/upload-response.dto"
import type { ConfigService } from "@nestjs/config"
import type { Express } from "express"

@Controller("media")
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly configService: ConfigService,
  ) {}

  @Post("upload")
  async getUploadUrl(
    @Body() uploadRequestDto: UploadRequestDto
  ): Promise<UploadResponseDto> {
    return this.mediaService.getUploadUrl(
      uploadRequestDto.filename,
      uploadRequestDto.filetype
    )
  }

  @Post("upload/local")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = process.env.UPLOAD_DIR || "uploads"
          cb(null, uploadDir)
        },
        filename: (req, file, cb) => {
          const filename = req.query.filename as string
          cb(null, filename)
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadLocalFile(
    @UploadedFile() file: Express.Multer.File,
    @Query("filename") filename: string,
  ): Promise<{ mediaUrl: string }> {
    if (!file) {
      throw new BadRequestException("No file uploaded")
    }

    const baseUrl = this.configService.get<string>("BASE_URL") || "http://localhost:3000"
    const mediaUrl = `${baseUrl}/uploads/${filename}`

    return { mediaUrl }
  }
}
