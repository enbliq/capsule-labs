/**
 * Formats a capsule document for API response
 * @param {Object} capsule - The capsule document from MongoDB
 * @param {Boolean} includeFullMessage - Whether to include the full message (true) or not (false)
 * @returns {Object} Formatted capsule object
 */
export function formatCapsuleForResponse(capsule, includeFullMessage = false) {
  // Base capsule info
  const formattedCapsule = {
    id: capsule._id.toString(),
    title: capsule.title,
    createdAt: capsule.createdAt,
    location: {
      type: capsule.location.type,
      coordinates: capsule.location.coordinates,
    },
    creator: capsule.creator
      ? {
          id: capsule.creator.toString(),
          // If you have a populated creator field, you could add more fields here
        }
      : null,
    // Include access and visibility settings
    visibility: {
      public: capsule.visibility.public,
      friends: capsule.visibility.friends || [],
    },
    // Include unlock conditions
    unlockConditions: {
      proximityRequired: capsule.unlockConditions?.proximityRequired || false,
      proximityRadius: capsule.unlockConditions?.proximityRadius || 50,
      timeWindow: capsule.unlockConditions?.timeWindow
        ? {
            start: capsule.unlockConditions.timeWindow.start,
            end: capsule.unlockConditions.timeWindow.end,
          }
        : null,
    },
    // Include metadata
    metadata: {
      views: capsule.metadata?.views || 0,
      unlocks: capsule.metadata?.unlocks || 0,
      tags: capsule.metadata?.tags || [],
    },
  };

  // Include the message based on the flag
  if (includeFullMessage && capsule.message) {
    formattedCapsule.message = capsule.message;
  }

  // Include media URLs if present
  if (capsule.media && capsule.media.length > 0) {
    formattedCapsule.media = capsule.media.map((item) => ({
      type: item.type,
      url: item.url,
      thumbnail: item.thumbnail || null,
    }));
  }

  return formattedCapsule;
}
