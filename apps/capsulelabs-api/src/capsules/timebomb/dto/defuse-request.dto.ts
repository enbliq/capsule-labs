import { IsNotEmpty, IsString } from "class-validator"

export class DefuseRequestDto {
  @IsNotEmpty()
  @IsString()
  username: string // Username of the user attempting to defuse
}
