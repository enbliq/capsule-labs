import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, IsLatitude, IsLongitude } from "class-validator"

export class CreateLocationLockCapsuleDto {
  @ApiProperty({
    description: "Title of the capsule",
    example: "Secret Message at Central Park",
  })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({
    description: "Content of the capsule",
    example: "Congratulations! You found the hidden treasure!",
  })
  @IsString()
  @IsNotEmpty()
  content: string

  @ApiProperty({
    description: "Latitude coordinate for the lock location",
    example: 40.7829,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @IsLatitude()
  lockLatitude: number

  @ApiProperty({
    description: "Longitude coordinate for the lock location",
    example: -73.9654,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @IsLongitude()
  lockLongitude: number

  @ApiProperty({
    description: "Allowed radius in meters for unlocking",
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  allowedRadiusMeters?: number = 20
}
