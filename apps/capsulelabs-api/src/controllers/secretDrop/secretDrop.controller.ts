import { Request, Response } from 'express';
import {
  SecretDropCapsuleModel,
  SecretDropSchema,
} from '../../models/secretDrop/secretDropCapsule';
import crypto from 'crypto';
import { validateUnlock } from '../../utils/unlockEngine';
import SecretDropUnlockModel from '../../models/SecretDropUnlock';

const HASH_LENGTH = 12;
const PEPPER = process.env.SECRET_HASH_PEPPER!;

export function generateUniqueHash(capsule: {
  _id: string;
  createdAt: { toISOString: () => string };
}): string {
  const input = `${capsule._id}${capsule.createdAt.toISOString()}${PEPPER}`;

  crypto
    .createHash('sha3-256') //
    .update(input)
    .digest('base64url')
    .substring(0, HASH_LENGTH);
}

export const createSecretDropCapsule = async (req: Request, res: Response) => {
  try {
    const validated = SecretDropSchema.parse(req.body);
    const capsule = new SecretDropCapsuleModel({
      ...validated,
      creatorId: req.user!.id,
      location: {
        type: 'Point',
        coordinates: validated.location.coordinates,
      },
    });

    await capsule.save();

    res.status(201).json({
      id: capsule._id,
      message: 'Capsule created successfully',
      hash: generateUniqueHash({
        _id: String(capsule._id),
        createdAt: capsule.createdAt,
      }),
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid input',
    });
  }
};

export const unlockCapsule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { longitude, latitude } = req.body;

    if (
      longitude === undefined ||
      latitude === undefined ||
      isNaN(Number(longitude)) ||
      isNaN(Number(latitude))
    ) {
      res.status(400).json({
        success: false,
        message: 'Valid longitude and latitude are required',
      });
    }

    const capsule = await SecretDropCapsuleModel.findById(id);

    if (!capsule || !capsule.isActive) {
      res.status(404).json({
        success: false,
        message: 'Capsule not found or inactive',
      });
    }

    const alreadyUnlocked = await SecretDropUnlockModel.findOne({
      userId: req.user!.id,
      capsuleId: capsule._id,
    });

    if (alreadyUnlocked) {
      res.status(400).json({
        success: false,
        message: 'You have already unlocked this capsule',
        data: {
          unlockTime: alreadyUnlocked.unlockTime,
          hasReply: !!alreadyUnlocked.reply,
        },
      });
    }

    const userLocation = [parseFloat(longitude), parseFloat(latitude)];

    const unlockResult = validateUnlock(capsule, userLocation);

    if (!unlockResult.canUnlock) {
      res.status(403).json({
        success: false,
        message: 'Cannot unlock capsule',
        reason: unlockResult.reason,
        details: unlockResult.details,
      });
    }

    // Success path — optionally save unlock
    const unlockEntry = await SecretDropUnlockModel.create({
      userId: req.user!.id,
      capsuleId: capsule._id,
      unlockTime: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Capsule unlocked successfully',
      data: unlockEntry,
    });
  } catch (error) {
    console.error('Unlock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while unlocking capsule',
    });
  }
};

export const getCapsule = async (req: Request, res: Response) => {
  try {
    const capsule = await SecretDropCapsuleModel.findOne({
      _id: req.params.id,
      creatorId: req.user!.id,
    }).lean();

    if (!capsule) res.status(404).json({ error: 'Capsule not found' });
    res.json(capsule);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateCapsule = async (req: Request, res: Response) => {
  try {
    const validated = SecretDropSchema.parse(req.body);
    const capsule = await SecretDropCapsuleModel.findOneAndUpdate(
      { _id: req.params.id, creatorId: req.user!.id },
      { $set: validated },
      { new: true, runValidators: true }
    );

    if (!capsule) res.status(404).json({ error: 'Capsule not found' });
    res.json(capsule);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid input',
    });
  }
};

export const deleteCapsule = async (req: Request, res: Response) => {
  try {
    const capsule = await SecretDropCapsuleModel.findOneAndDelete({
      _id: req.params.id,
      creatorId: req.user!.id,
    });

    if (!capsule) res.status(404).json({ error: 'Capsule not found' });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};
