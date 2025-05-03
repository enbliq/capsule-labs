import { Controller, Post, Body, Get, Param, Query } from "@nestjs/common"
import type { TimeBombCapsuleService } from "./timebomb-capsule.service"
import type { PlantTimeBombDto } from "./dto/plant-timebomb.dto"
import { TimeBombResponseDto } from "./dto/timebomb-response.dto"
import type { NearbyRequestDto } from "./dto/nearby-request.dto"
import type { NearbyCapsuleDto } from "./dto/nearby-response.dto"

@Controller("timebomb")
export class TimeBombCapsuleController {
  constructor(private readonly timeBombService: TimeBombCapsuleService) {}

  @Post("plant")
  async plantTimeBomb(
    @Body() plantTimeBombDto: PlantTimeBombDto,
  ): Promise<TimeBombResponseDto> {
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
}
