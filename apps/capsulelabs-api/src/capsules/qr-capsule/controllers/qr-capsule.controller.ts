import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  UsePipes,
} from "@nestjs/common"
import type { QrCapsuleService } from "../services/qr-capsule.service"
import type { CreateQrCapsuleDto, ScanQrDto, UpdateQrCapsuleDto, QrCapsuleQueryDto } from "../dto/qr-capsule.dto"

@Controller("qr-capsule")
@UsePipes(new ValidationPipe({ transform: true }))
export class QrCapsuleController {
  constructor(private readonly qrCapsuleService: QrCapsuleService) {}

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  async createCapsule(@Body() createDto: CreateQrCapsuleDto) {
    const capsule = await this.qrCapsuleService.createQrCapsule(createDto)
    const qrCodeData = await this.qrCapsuleService.generateQrCodeData(capsule.id)

    return {
      success: true,
      data: {
        capsule,
        qrCodeData,
        qrCodeHash: capsule.qrCodeHash,
      },
      message: "QR capsule created successfully",
    }
  }

  @Post("scan")
  @HttpCode(HttpStatus.OK)
  async scanQrCode(@Body() scanDto: ScanQrDto) {
    const result = await this.qrCapsuleService.scanQrCode(scanDto)
    
    return {
      success: result.success,
      data: result.success ? {
        capsule: result.capsule,
        reward: result.reward,
      } : null,
      message: result.message,
      errorCode: result.errorCode,
    }
  }

  @Get(":id")
  getCapsule(@Param("id") id: string) {
    const capsule = this.qrCapsuleService.getCapsule(id)
    const status = this.qrCapsuleService.getCapsuleStatus(capsule)
    
    return {
      success: true,
      data: {
        capsule,
        status,
      },
    }
  }

  @Put(":id")
  updateCapsule(@Param("id") id: string, @Body() updateDto: UpdateQrCapsuleDto) {
    const capsule = this.qrCapsuleService.updateCapsule(id, updateDto)

    return {
      success: true,
      data: capsule,
      message: "Capsule updated successfully",
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCapsule(@Param("id") id: string) {
    this.qrCapsuleService.deleteCapsule(id)
  }

  @Get()
  getAllCapsules(@Query() query: QrCapsuleQueryDto) {
    const capsules = this.qrCapsuleService.getAllCapsules({
      createdBy: query.createdBy,
      unlocked: query.unlocked,
      isActive: query.isActive,
      limit: query.limit,
      offset: query.offset,
    })
    
    return {
      success: true,
      data: capsules,
      total: capsules.length,
    }
  }

  @Get("user/:userId/unlocks")
  getUserUnlocks(@Param("userId") userId: string) {
    const unlocks = this.qrCapsuleService.getUserUnlocks(userId)
    
    return {
      success: true,
      data: unlocks,
      total: unlocks.length,
    }
  }

  @Get(":id/qr-code")
  async getQrCode(@Param("id") id: string) {
    const qrCodeData = await this.qrCapsuleService.generateQrCodeData(id)
    
    return {
      success: true,
      data: {
        qrCodeData,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData)}`,
      },
    }
  }
}
