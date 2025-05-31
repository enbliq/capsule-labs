import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import type { DaylightCapsuleService } from "./daylight-capsule.service"
import type { CreateDaylightCapsuleDto } from "./dto/create-daylight-capsule.dto"
import { ViewDaylightCapsuleDto } from "./dto/view-daylight-capsule.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@ApiTags("daylight-capsules")
@Controller("capsules/daylight")
export class DaylightCapsuleController {
  constructor(private readonly daylightCapsuleService: DaylightCapsuleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new daylight capsule" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The capsule has been successfully created.",
    type: ViewDaylightCapsuleDto,
  })
  async create(@Body() createDaylightCapsuleDto: CreateDaylightCapsuleDto, @Request() req) {
    const capsule = await this.daylightCapsuleService.create(createDaylightCapsuleDto, req.user.id)
    return this.daylightCapsuleService.findOne(capsule.id)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a daylight capsule by ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns the capsule if it\'s daylight, otherwise returns locked status',
    type: ViewDaylightCapsuleDto 
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Capsule not found' })
  findOne(@Param('id') id: string) {
    return this.daylightCapsuleService.findOne(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all daylight capsules for the current user' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns all capsules with their locked/unlocked status',
    type: [ViewDaylightCapsuleDto] 
  })
  findAll(@Request() req) {
    return this.daylightCapsuleService.findAll(req.user.id);
  }
}
