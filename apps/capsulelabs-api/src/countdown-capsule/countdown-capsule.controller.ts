import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger"
import type { CountdownCapsuleService } from "./countdown-capsule.service"
import type { CreateCountdownCapsuleDto } from "./dto/create-countdown-capsule.dto"
import type { StartCountdownDto } from "./dto/start-countdown.dto"
import { CountdownCapsuleResponseDto } from "./dto/countdown-capsule-response.dto"

@ApiTags("countdown-capsules")
@Controller("countdown-capsules")
export class CountdownCapsuleController {
  constructor(private readonly countdownCapsuleService: CountdownCapsuleService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new countdown capsule' })
  @ApiResponse({
    status: 201,
    description: 'Countdown capsule created successfully',
    type: CountdownCapsuleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createCountdownCapsuleDto: CreateCountdownCapsuleDto,
  ): Promise<CountdownCapsuleResponseDto> {
    return this.countdownCapsuleService.create(createCountdownCapsuleDto);
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start the countdown for a capsule' })
  @ApiResponse({
    status: 200,
    description: 'Countdown started successfully',
    type: CountdownCapsuleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Countdown capsule not found' })
  @ApiResponse({ status: 409, description: 'Countdown already started' })
  async start(
    @Body() startCountdownDto: StartCountdownDto,
  ): Promise<CountdownCapsuleResponseDto> {
    return this.countdownCapsuleService.start(startCountdownDto);
  }

  @Get('view/:id')
  @ApiOperation({ summary: 'View a countdown capsule' })
  @ApiParam({ name: 'id', description: 'Countdown capsule UUID' })
  @ApiResponse({
    status: 200,
    description: 'Countdown capsule retrieved successfully',
    type: CountdownCapsuleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Countdown capsule not found' })
  async view(@Param('id') id: string): Promise<CountdownCapsuleResponseDto> {
    return this.countdownCapsuleService.view(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all countdown capsules' })
  @ApiQuery({ name: 'createdBy', required: false, description: 'Filter by creator' })
  @ApiResponse({
    status: 200,
    description: 'Countdown capsules retrieved successfully',
    type: [CountdownCapsuleResponseDto],
  })
  async findAll(
    @Query('createdBy') createdBy?: string,
  ): Promise<CountdownCapsuleResponseDto[]> {
    if (createdBy) {
      return this.countdownCapsuleService.findByCreator(createdBy);
    }
    return this.countdownCapsuleService.findAll();
  }
}
