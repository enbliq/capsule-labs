const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point',
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
});

const secretDropUnlockSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    capsuleId: {
      type: Schema.Types.ObjectId,
      ref: 'CapsuleLabCapsule',
      required: true,
      index: true,
    },
    unlockTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    userLocation: {
      type: pointSchema,
      required: true,
    },
    distanceAtUnlock: {
      type: Number,
      required: true,
    },
    reply: {
      content: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      createdAt: {
        type: Date,
      },
      updatedAt: {
        type: Date,
      },
    },
    streakDay: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

secretDropUnlockSchema.index({ userId: 1, capsuleId: 1 }, { unique: true });

secretDropUnlockSchema.virtual('canReply').get(function () {
  if (this.reply?.content) return false;

  const now = new Date();
  const unlockTime = new Date(this.unlockTime);
  const timeDiff = now - unlockTime;

  return timeDiff < 5 * 60 * 1000;
});

secretDropUnlockSchema.methods.addReply = async function (content) {
  if (!this.canReply) {
    throw new Error('Reply window has expired');
  }

  const now = new Date();

  if (!this.reply?.content) {
    this.reply = {
      content,
      createdAt: now,
      updatedAt: now,
    };
  } else {
    this.reply.content = content;
    this.reply.updatedAt = now;
  }

  return this.save();
};

const SecretDropUnlock = mongoose.model(
  'SecretDropUnlock',
  secretDropUnlockSchema
);

module.exports = SecretDropUnlock;
