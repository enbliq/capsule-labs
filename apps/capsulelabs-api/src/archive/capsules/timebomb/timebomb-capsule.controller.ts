import { Controller, Post, Body, Get, Param, Query } from "@nestjs/common"
import type { TimeBombCapsuleService } from "./timebomb-capsule.service"
import type { TimeBombExpiryService } from "./timebomb-expiry.service"
import type { PlantTimeBombDto } from "./dto/plant-timebomb.dto"
import { TimeBombResponseDto } from "./dto/timebomb-response.dto"
import type { NearbyRequestDto } from "./dto/nearby-request.dto"
import type { NearbyCapsuleDto } from "./dto/nearby-response.dto"
import type { DefuseRequestDto } from "./dto/defuse-request.dto"
import type { DefuseResponseDto } from "./dto/defuse-response.dto"

@Controller("timebomb")
export class TimeBombCapsuleConController {
  constructor(
    private readonly timeBombService: TimeBombCapsuleService,
    private readonly timeBombExpiryService: TimeBombExpiryService,
  ) {}

  @Post("plant")
  async plantTimeBomb(@Body() plantTimeBombDto: PlantTimeBombDto): Promise<TimeBombResponseDto> {
    const timeBomb = await this.timeBombService.plantTimeBomb(plantTimeBombDto);
    return new TimeBombResponseDto(timeBomb);
  }

  @Get(":id")
  async getTimeBombById(@Param("id") id: string): Promise<TimeBombResponseDto> {
    const timeBomb = await this.timeBombService.findById(id)
    return new TimeBombResponseDto(timeBomb)
  }

  @Get("nearby")
  async findNearby(@Query() nearbyRequestDto: NearbyRequestDto): Promise<NearbyCapsuleDto[]> {
    return this.timeBombService.findNearby(nearbyRequestDto)
  }

  @Post(":id/defuse")
  async defuseTimeBomb(
    @Param("id") id: string,
    @Body() defuseRequestDto: DefuseRequestDto,
  ): Promise<DefuseResponseDto> {
    return this.timeBombService.defuseTimeBomb(id, defuseRequestDto)
  }

  @Post("trigger-expiry-check")
  async triggerExpiryCheck() {
    return this.timeBombExpiryService.triggerExpiryCheck()
  }
}
