import { Schema } from 'mongoose';
import CapsuleLabCapsule, {
  type ICapsuleLabCapsule,
} from './CapsuleLabCapsule';

export interface IWhisperVoteCapsule extends ICapsuleLabCapsule {
  question: string;
  options: string[];
  unlockWindow: {
    start: Date;
    end: Date;
  };
  maxVotes: number;
  currentVotes: number;
  discoveryRadius: number; // in meters
}

const WhisperVoteCapsuleSchema = new Schema<IWhisperVoteCapsule>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (options: string[]) =>
          options.length >= 2 && options.length <= 4,
        message: 'WhisperVote capsules must have between 2 and 4 options',
      },
    },
    unlockWindow: {
      start: {
        type: Date,
        default: Date.now,
      },
      end: {
        type: Date,
        required: true,
      },
    },
    maxVotes: {
      type: Number,
      default: 0, // 0 means unlimited
    },
    currentVotes: {
      type: Number,
      default: 0,
    },
    discoveryRadius: {
      type: Number,
      default: 100, // Default 100 meters
      min: 10,
      max: 5000,
    },
  },
  {
    discriminatorKey: 'capsuleType',
  }
);

// Pre-save validation
WhisperVoteCapsuleSchema.pre('save', function (next) {
  // Ensure options are unique
  const uniqueOptions = [...new Set(this.options)];
  if (uniqueOptions.length !== this.options.length) {
    return next(new Error('Options must be unique'));
  }

  // Ensure options are not empty
  if (this.options.some((option) => option.trim() === '')) {
    return next(new Error('Options cannot be empty'));
  }

  // Ensure unlock window is valid
  if (this.unlockWindow.end <= this.unlockWindow.start) {
    return next(new Error('End time must be after start time'));
  }

  next();
});

const WhisperVoteCapsule = CapsuleLabCapsule.discriminator<IWhisperVoteCapsule>(
  'WhisperVoteCapsule',
  WhisperVoteCapsuleSchema
);

export default WhisperVoteCapsule;
