import type { ContentType } from "../../base-capsule.schema"

export class DefuseResponseDto {
  id: string
  contentType: ContentType
  content: string // Either the message text or media URL
  defused: boolean
  isMaxDefusersReached: boolean
}
