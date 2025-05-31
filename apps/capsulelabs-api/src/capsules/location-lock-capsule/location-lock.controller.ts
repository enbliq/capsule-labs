import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger"
import type { LocationLockService } from "./location-lock.service"
import type { CreateLocationLockCapsuleDto } from "./dto/create-location-lock-capsule.dto"
import type { UnlockAttemptDto } from "./dto/unlock-attempt.dto"
import { UnlockResponseDto } from "./dto/unlock-response.dto"
import { LocationLockCapsule } from "./entities/location-lock-capsule.entity"

@ApiTags("Location Lock Capsules")
@Controller("capsules/location-lock")
export class LocationLockController {
  constructor(private readonly locationLockService: LocationLockService) {}

  @Post()
  @ApiOperation({
    summary: "Create a new location-locked capsule",
    description: "Creates a capsule that can only be unlocked at specific GPS coordinates",
  })
  @ApiResponse({
    status: 201,
    description: "Capsule created successfully",
    type: LocationLockCapsule,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid input data",
  })
  async create(
    @Body() createLocationLockCapsuleDto: CreateLocationLockCapsuleDto,
    @Query('userId') userId: string = 'default-user', // In real app, get from JWT token
  ): Promise<LocationLockCapsule> {
    return await this.locationLockService.create(createLocationLockCapsuleDto, userId)
  }

  @Get()
  @ApiOperation({
    summary: 'Get all location-locked capsules',
    description: 'Retrieves all capsules (without content for security)',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of capsules retrieved successfully',
    type: [LocationLockCapsule],
  })
  async findAll(
    @Query('userId') userId?: string,
  ): Promise<LocationLockCapsule[]> {
    return await this.locationLockService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific capsule by ID',
    description: 'Retrieves capsule metadata (without content for security)',
  })
  @ApiParam({
    name: 'id',
    description: 'Capsule UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Capsule retrieved successfully',
    type: LocationLockCapsule,
  })
  @ApiResponse({
    status: 404,
    description: 'Capsule not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LocationLockCapsule> {
    return await this.locationLockService.findOne(id);
  }

  @Post(":id/unlock")
  @ApiOperation({
    summary: "Attempt to unlock a capsule",
    description: `Submit your current GPS coordinates to unlock a capsule. 
    The server validates your location against the capsule's lock coordinates using the Haversine formula.
    If you're within the allowed radius, you'll receive the capsule content.`,
  })
  @ApiParam({
    name: "id",
    description: "Capsule UUID to unlock",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Unlock attempt processed",
    type: UnlockResponseDto,
    examples: {
      success: {
        summary: "Successful unlock",
        value: {
          success: true,
          message: "Capsule unlocked successfully!",
          distanceMeters: 15.5,
          content: "Congratulations! You found the hidden treasure!",
          title: "Secret Message at Central Park",
        },
      },
      failure: {
        summary: "Failed unlock (too far)",
        value: {
          success: false,
          message: "You are 150m away. Get within 20m to unlock.",
          distanceMeters: 150.2,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Capsule not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid GPS coordinates",
  })
  async unlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() unlockAttemptDto: UnlockAttemptDto,
  ): Promise<UnlockResponseDto> {
    return await this.locationLockService.attemptUnlock(id, unlockAttemptDto)
  }

  @Post("seed")
  @ApiOperation({
    summary: "Seed test data",
    description: "Creates test capsules at Times Square and Central Park for testing",
  })
  @ApiResponse({
    status: 201,
    description: "Test data seeded successfully",
  })
  async seedTestData(): Promise<{ message: string }> {
    await this.locationLockService.seedTestData()
    return { message: "Test capsules seeded successfully!" }
  }
}
