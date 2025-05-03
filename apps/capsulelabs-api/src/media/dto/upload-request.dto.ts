import { IsNotEmpty, IsString } from "class-validator"

export class UploadRequestDto {
  @IsNotEmpty()
  @IsString()
  filename: string

  @IsNotEmpty()
  @IsString()
  filetype: string
}
