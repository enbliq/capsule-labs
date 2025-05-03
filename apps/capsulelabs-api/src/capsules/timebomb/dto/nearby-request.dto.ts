import { IsNumber, IsOptional, IsString } from "class-validator"
import { Type } from "class-transformer"

export class NearbyRequestDto {
  @IsNumber()
  @Type(() => Number)
  lat: number

  @IsNumber()
  @Type(() => Number)
  lng: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radius?: number = 300 // Default radius in meters

  @IsOptional()
  @IsString()
  username?: string // To exclude capsules planted by this user
}
