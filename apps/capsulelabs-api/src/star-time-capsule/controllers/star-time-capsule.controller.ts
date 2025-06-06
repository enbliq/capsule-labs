import { Controller, Post, Get, Body, Query, Param } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger"
import type { StarTimeCapsuleService } from "../services/star-time-capsule.service"
import type { CreateAstronomyCapsuleDto } from "../dto/create-astronomy-capsule.dto"
import type { CheckAstronomyUnlockDto } from "../dto/check-astronomy-unlock.dto"
import type { AstronomicalEventType } from "../enums/astronomical-event.enum"

@ApiTags("Star Time Capsule")
@Controller("star-time-capsule")
export class StarTimeCapsuleController {
  constructor(private readonly starTimeCapsuleService: StarTimeCapsuleService) {}

  @Post('create')
  @ApiOperation({ 
    summary: 'Create a new star time capsule',
    description: 'Creates a time capsule that will unlock during a specific astronomical event'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Star time capsule created successfully'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data or expected date is in the past'
  })
  async create(@Body() createDto: CreateAstronomyCapsuleDto) {
    return this.starTimeCapsuleService.create(createDto);
  }

  @Post('check')
  @ApiOperation({
    summary: 'Check and unlock star time capsules',
    description: 'Checks if astronomical events have occurred and unlocks corresponding capsules'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Check completed successfully'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Specific capsule not found (when checking by ID)'
  })
  async checkUnlock(@Body() checkDto: CheckAstronomyUnlockDto) {
    return this.starTimeCapsuleService.checkUnlock(checkDto);
  }

  @Get('capsules')
  @ApiOperation({ 
    summary: 'Get all star time capsules',
    description: 'Retrieves all star time capsules, optionally filtered by creator'
  })
  @ApiQuery({ 
    name: 'createdBy', 
    required: false, 
    description: 'Filter by capsule creator'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of star time capsules'
  })
  async findAll(@Query('createdBy') createdBy?: string) {
    return this.starTimeCapsuleService.findAll(createdBy);
  }

  @Get('capsules/:id')
  @ApiOperation({ 
    summary: 'Get a specific star time capsule',
    description: 'Retrieves a single star time capsule by its ID'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Star time capsule found'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Star time capsule not found'
  })
  async findOne(@Param('id') id: string) {
    return this.starTimeCapsuleService.findOne(id);
  }

  @Get('events/upcoming')
  @ApiOperation({ 
    summary: 'Get upcoming astronomical events',
    description: 'Retrieves a list of upcoming astronomical events for planning capsules'
  })
  @ApiQuery({ 
    name: 'months', 
    required: false, 
    description: 'Number of months to look ahead (default: 12)',
    type: Number
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of upcoming astronomical events'
  })
  async getUpcomingEvents(@Query('months') months?: number) {
    return this.starTimeCapsuleService.getUpcomingEvents(months);
  }

  @Get('events/suggest/:eventType')
  @ApiOperation({ 
    summary: 'Suggest next event date',
    description: 'Suggests the next occurrence date for a specific astronomical event type'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Suggested event date'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid event type or calculation error'
  })
  async suggestNextEventDate(@Param('eventType') eventType: AstronomicalEventType) {
    return this.starTimeCapsuleService.suggestNextEventDate(eventType);
  }
}
