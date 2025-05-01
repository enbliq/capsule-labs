import mongoose, { Document, Model, Schema, Types } from "mongoose";

export enum CapsuleType {
  SECRET_DROP = "secretDrop",
  MIRROR_CAPSULE = "mirrorCapsule",
}

export interface VisibilitySettings {
  public: boolean;
  ttlHours?: number;
  maxUnlocks?: number;
}

export interface ICapsuleLabCapsule {
  creatorId: Types.ObjectId;
  type: CapsuleType;
  metadata: Record<string, any>;
  isActive: boolean;
  visibility: VisibilitySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface CapsuleLabCapsuleDocument
  extends ICapsuleLabCapsule,
    Document {
  deactivate(): Promise<CapsuleLabCapsuleDocument>;
  updateMetadata(
    newMetadata: Record<string, any>
  ): Promise<CapsuleLabCapsuleDocument>;
}

export interface CapsuleLabCapsuleModel
  extends Model<CapsuleLabCapsuleDocument> {
  TYPES: typeof CapsuleType;
  isValidType(type: string): boolean;
  findByCreator(
    creatorId: Types.ObjectId
  ): Promise<CapsuleLabCapsuleDocument[]>;
}

const schemaOptions: mongoose.SchemaOptions = {
  timestamps: true,
  discriminatorKey: "type",
  toJSON: {
    virtuals: true,
    transform: function (doc: any, ret: any) {
      delete ret.__v;
      return ret;
    },
  },
  toObject: { virtuals: true },
};

const capsuleLabSchema = new Schema<
  CapsuleLabCapsuleDocument,
  CapsuleLabCapsuleModel
>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(CapsuleType),
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    visibility: {
      public: {
        type: Boolean,
        default: true,
      },
      ttlHours: {
        type: Number,
        min: 1,
        max: 8760,
      },
      maxUnlocks: {
        type: Number,
        min: 1,
      },
    },
  },
  schemaOptions
);

capsuleLabSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: function (this: CapsuleLabCapsuleDocument) {
      return this.visibility.ttlHours
        ? this.visibility.ttlHours * 3600
        : Infinity;
    },
  }
);

capsuleLabSchema.methods = {
  deactivate: function (
    this: CapsuleLabCapsuleDocument
  ): Promise<CapsuleLabCapsuleDocument> {
    this.isActive = false;
    return this.save();
  },

  updateMetadata: function (
    this: CapsuleLabCapsuleDocument,
    newMetadata: Record<string, any>
  ): Promise<CapsuleLabCapsuleDocument> {
    this.metadata = { ...this.metadata, ...newMetadata };
    return this.save();
  },
};

capsuleLabSchema.statics = {
  TYPES: CapsuleType,

  isValidType: function (type: string): boolean {
    return Object.values(this.TYPES).includes(type);
  },

  findByCreator: function (
    creatorId: Types.ObjectId
  ): Promise<CapsuleLabCapsuleDocument[]> {
    return this.find({ creatorId, isActive: true });
  },
};

const CapsuleLabCapsule = mongoose.model<
  CapsuleLabCapsuleDocument,
  CapsuleLabCapsuleModel
>("CapsuleLabCapsule", capsuleLabSchema);

export { CapsuleLabCapsule, capsuleLabSchema };
