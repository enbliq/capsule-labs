import { IsNotEmpty, IsString, IsNumber, Min, Max } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreateDaylightCapsuleDto {
  @ApiProperty({ description: "Title of the daylight capsule" })
  @IsNotEmpty()
  @IsString()
  title: string

  @ApiProperty({ description: "Content of the daylight capsule" })
  @IsNotEmpty()
  @IsString()
  content: string

  @ApiProperty({ description: "Latitude of the location (-90 to 90)" })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number

  @ApiProperty({ description: "Longitude of the location (-180 to 180)" })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number

  @ApiProperty({ description: 'Timezone string (e.g., "America/New_York")' })
  @IsString()
  @IsNotEmpty()
  timezone: string
}
