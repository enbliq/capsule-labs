import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { BaseCapsule } from "../../base-capsule.schema"

export type TimeBombStatus = "active" | "defused" | "expired"

@Schema()
export class Location {
  @Prop({ required: true, type: Number })
  lat: number

  @Prop({ required: true, type: Number })
  lng: number
}

@Schema()
export class TimeBombCapsule extends BaseCapsule {
  @Prop({ required: true, type: Location })
  location: Location

  @Prop({ required: true })
  expiresAt: Date

  @Prop({ type: [String], default: [] })
  defusers: string[] // usernames

  @Prop({ required: true })
  maxDefusers: number

  @Prop({ required: true, enum: ["active", "defused", "expired"], default: "active" })
  status: TimeBombStatus
}

export const TimeBombCapsuleSchema = SchemaFactory.createForClass(TimeBombCapsule)

// Add index for geospatial queries
TimeBombCapsuleSchema.index({ location: "2dsphere" })
