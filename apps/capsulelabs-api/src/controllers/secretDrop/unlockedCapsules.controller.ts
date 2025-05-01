import { Request, Response } from 'express';
const SecretDropUnlock = require('../../models/capsuleLab/secretDropUnlock');

export const unlockedCapsules = async (req: Request, res: Response) => {
  try {
    const {
      limit = 20,
      skip = 0,
      sortBy = 'recent', // 'recent' or 'oldest'
    } = req.query;

    // Parse pagination params
    const parsedLimit = Math.min(Math.max(parseInt(limit), 1), 50); // Between 1 and 50
    const parsedSkip = Math.max(parseInt(skip), 0); // Min 0

    // Determine sort order
    const sortOrder = sortBy === 'oldest' ? 1 : -1;

    // Query for user's unlock history
    const unlocks = await SecretDropUnlock.find({
      userId: req.user._id,
    })
      .sort({ unlockTime: sortOrder })
      .skip(parsedSkip)
      .limit(parsedLimit)
      .populate({
        path: 'capsuleId',
        select:
          'message location hint creatorId unlockConditions visibility metadata',
      })
      .lean();

    // Get total count for pagination
    const totalCount = await SecretDropUnlock.countDocuments({
      userId: req.user._id,
    });

    // Format the results
    const formattedUnlocks = unlocks.map((unlock) => {
      // Skip if the related capsule is not found (may have been deleted)
      if (!unlock.capsuleId) {
        return {
          id: unlock._id,
          unlockTime: unlock.unlockTime,
          capsuleDeleted: true,
        };
      }

      // Format capsule data
      const capsule = unlock.capsuleId;

      return {
        id: unlock._id,
        unlockTime: unlock.unlockTime,
        distanceAtUnlock: unlock.distanceAtUnlock,
        capsule: {
          id: capsule._id,
          message: capsule.message,
          location: capsule.location,
          hint: capsule.hint,
          creatorId: capsule.creatorId,
        },
        reply: unlock.reply,
        // Add whether user can still reply
        canReply:
          !unlock.reply?.content &&
          new Date() - new Date(unlock.unlockTime) < 5 * 60 * 1000,
        streakDay: unlock.streakDay,
      };
    });

    // Remove any null entries (from deleted capsules)
    const filteredUnlocks = formattedUnlocks.filter(
      (unlock) => unlock !== null
    );

    return res.status(200).json({
      success: true,
      data: filteredUnlocks,
      pagination: {
        total: totalCount,
        limit: parsedLimit,
        skip: parsedSkip,
        hasMore: totalCount > parsedSkip + parsedLimit,
      },
    });
  } catch (error) {
    console.error('Error fetching unlock history:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching unlock history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const unlockCapsule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the specific unlock by ID
    const unlock = await SecretDropUnlock.findById(id).populate({
      path: 'capsuleId',
      select:
        'message location hint creatorId unlockConditions visibility metadata',
    });

    // Check if unlock exists and belongs to the requesting user
    if (!unlock || unlock.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Unlock record not found',
      });
    }

    // Check if related capsule exists
    if (!unlock.capsuleId) {
      return res.status(200).json({
        success: true,
        data: {
          id: unlock._id,
          unlockTime: unlock.unlockTime,
          capsuleDeleted: true,
        },
      });
    }

    // Format the result
    const formattedUnlock = {
      id: unlock._id,
      unlockTime: unlock.unlockTime,
      distanceAtUnlock: unlock.distanceAtUnlock,
      userLocation: unlock.userLocation,
      capsule: {
        id: unlock.capsuleId._id,
        message: unlock.capsuleId.message,
        location: unlock.capsuleId.location,
        hint: unlock.capsuleId.hint,
        creatorId: unlock.capsuleId.creatorId,
        unlockConditions: unlock.capsuleId.unlockConditions,
        visibility: unlock.capsuleId.visibility,
        metadata: unlock.capsuleId.metadata,
      },
      reply: unlock.reply,
      // Calculate if user can still reply
      canReply: unlock.canReply,
      streakDay: unlock.streakDay,
    };

    return res.status(200).json({
      success: true,
      data: formattedUnlock,
    });
  } catch (error) {
    console.error('Error fetching unlock details:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching unlock details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
