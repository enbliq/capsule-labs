import { IsString, IsEmail, IsOptional, IsNumber, IsObject, Min, Max, IsNotEmpty } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class CreateSocialCapsuleDto {
  @ApiProperty({ description: "User ID of the capsule owner" })
  @IsString()
  @IsNotEmpty()
  userId: string

  @ApiProperty({ description: "Title of the social capsule" })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({ description: "Content to be unlocked" })
  @IsObject()
  content: any

  @ApiPropertyOptional({ description: "Description of the capsule" })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: "Owner's email address" })
  @IsOptional()
  @IsEmail()
  ownerEmail?: string

  @ApiPropertyOptional({ description: "Owner's username" })
  @IsOptional()
  @IsString()
  ownerUsername?: string

  @ApiPropertyOptional({ description: "Number of friends required to unlock", minimum: 1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  requiredFriends?: number

  @ApiPropertyOptional({ description: "Expiration time in milliseconds from now" })
  @IsOptional()
  @IsNumber()
  @Min(60000) // Minimum 1 minute
  expiresIn?: number

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}

export class InviteFriendDto {
  @ApiProperty({ description: "Owner's user ID" })
  @IsString()
  @IsNotEmpty()
  ownerId: string

  @ApiProperty({ description: "Friend's email address" })
  @IsEmail()
  friendEmail: string

  @ApiPropertyOptional({ description: "Friend's user ID (if known)" })
  @IsOptional()
  @IsString()
  friendId?: string

  @ApiPropertyOptional({ description: "Friend's username" })
  @IsOptional()
  @IsString()
  friendUsername?: string
}

export class AcceptInviteDto {
  @ApiProperty({ description: "Invite code received from friend" })
  @IsString()
  @IsNotEmpty()
  inviteCode: string

  @ApiProperty({ description: "User ID accepting the invite" })
  @IsString()
  @IsNotEmpty()
  userId: string
}

export class OpenCapsuleDto {
  @ApiProperty({ description: "User ID opening the capsule" })
  @IsString()
  @IsNotEmpty()
  userId: string
}

export class GetCapsuleDto {
  @ApiPropertyOptional({ description: "User ID for ownership verification" })
  @IsOptional()
  @IsString()
  userId?: string
}
