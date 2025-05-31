import { ApiProperty } from "@nestjs/swagger"
import { IsNumber, IsLatitude, IsLongitude } from "class-validator"

export class UnlockAttemptDto {
  @ApiProperty({
    description: "Current latitude of the user",
    example: 40.7829,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @IsLatitude()
  currentLatitude: number

  @ApiProperty({
    description: "Current longitude of the user",
    example: -73.9654,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @IsLongitude()
  currentLongitude: number
}
