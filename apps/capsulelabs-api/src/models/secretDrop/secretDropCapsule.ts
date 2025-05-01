import mongoose from 'mongoose';
import { CapsuleLabCapsule, VALID_CAPSULE_TYPES, capsuleLabSchema } from './baseCapsule';
import Joi from 'joi';

// Define the GeoJSON Point schema for location
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
    validate: {
      validator: function (coords) {
        return (
          coords.length === 2 &&
          coords[0] >= -180 &&
          coords[0] <= 180 && // longitude
          coords[1] >= -90 &&
          coords[1] <= 90
        ); // latitude
      },
      message:
        'Invalid coordinates. Longitude must be between -180 and 180, and latitude between -90 and 90.',
    },
  },
});

// Schema for SecretDrop-specific fields
const secretDropSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 5000,
  },
  location: {
    type: pointSchema,
    required: true,
    index: '2dsphere', // Create geospatial index for location queries
  },
  unlockConditions: {
    distance: {
      type: Number,
      required: true,
      min: 5, // Minimum 5 meters
      max: 1000, // Maximum 1km
    },
    timeWindow: {
      start: {
        type: Date,
      },
      end: {
        type: Date,
        validate: {
          validator: function (endDate) {
            // If both start and end are provided, ensure end is after start
            const startDate = this.unlockConditions?.timeWindow?.start;
            return !startDate || !endDate || endDate > startDate;
          },
          message: 'End time must be after start time',
        },
      },
    },
  },
  hint: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  unlockCount: {
    type: Number,
    default: 0,
  },
  // Additional SecretDrop-specific fields can be added here
});

// Create the discriminator model
const SecretDropCapsule = CapsuleLabCapsule.discriminator(
  VALID_CAPSULE_TYPES.SECRET_DROP,
  secretDropSchema
);

// Joi validation schema for API input validation
const secretDropValidationSchema = Joi.object({
  message: Joi.string().trim().min(1).max(5000).required(),
  location: Joi.object({
    coordinates: Joi.array()
      .ordered(
        Joi.number().min(-180).max(180).required(), // longitude
        Joi.number().min(-90).max(90).required() // latitude
      )
      .length(2)
      .required(),
  }).required(),
  unlockConditions: Joi.object({
    distance: Joi.number().min(5).max(1000).required(),
    timeWindow: Joi.object({
      start: Joi.date().iso(),
      end: Joi.date().iso().greater(Joi.ref('start')),
    }),
  }).required(),
  visibility: Joi.object({
    public: Joi.boolean(),
    ttlHours: Joi.number().integer().min(1).max(8760),
    maxUnlocks: Joi.number().integer().min(1),
  }),
  hint: Joi.string().trim().max(200),
});

// Helper function to validate SecretDrop payload
function validateSecretDropPayload(payload) {
  return secretDropValidationSchema.validate(payload, { abortEarly: false });
}

// Helper function to format the capsule data for API responses
function formatCapsuleForResponse(capsule, includeFullDetails = true) {
  const response = {
    id: capsule._id,
    type: capsule.type,
    location: capsule.location,
    createdAt: capsule.createdAt,
    unlockConditions: {
      distance: capsule.unlockConditions.distance,
    },
    hint: capsule.hint,
    unlockCount: capsule.unlockCount,
  };

  // Add time window if it exists
  if (capsule.unlockConditions.timeWindow?.start) {
    response.unlockConditions.timeWindow = {
      start: capsule.unlockConditions.timeWindow.start,
      end: capsule.unlockConditions.timeWindow.end,
    };
  }

  // Include message and other details only if full details are requested
  if (includeFullDetails) {
    response.message = capsule.message;
    response.visibility = capsule.visibility;
  }

  return response;
}

module.exports = {
  SecretDropCapsule,
  validateSecretDropPayload,
  formatCapsuleForResponse,
};
