import { IsString, IsOptional } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class StartSessionDto {
  @ApiProperty({ description: "User agent string", required: false })
  @IsOptional()
  @IsString()
  userAgent?: string

  @ApiProperty({ description: "IP address", required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string
}
