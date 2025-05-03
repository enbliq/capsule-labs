import { Prop } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type ContentType = "text" | "media"

export abstract class BaseCapsule extends Document {
  @Prop({ required: true })
  id: string

  @Prop({ required: true, enum: ["text", "media"] })
  contentType: ContentType

  @Prop()
  message?: string

  @Prop()
  mediaUrl?: string

  @Prop({ required: true })
  createdAt: Date

  @Prop({ required: true })
  createdBy: string // username
}
