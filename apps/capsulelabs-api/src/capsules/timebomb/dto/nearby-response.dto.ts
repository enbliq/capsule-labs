import type { ContentType } from "../../base-capsule.schema"

export class NearbyCapsuleDto {
  id: string
  distance: number // in meters
  timeRemaining: number // in seconds
  contentType: ContentType
  previewHint: string
}
