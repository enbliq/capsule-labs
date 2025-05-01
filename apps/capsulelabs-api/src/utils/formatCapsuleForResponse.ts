interface Capsule {
    _id: string;
    title: string;
    location: {
      type: string;
      coordinates: [number, number];
    };
    createdAt: Date;
    visibility: {
      public: boolean;
    };
    unlockConditions: { [key: string]: unknown };
    message?: string;
    [key: string]: unknown;
  }
  
  /**
   * 
   * @param capsule 
   * @param includeMessage 
   */
  export default function formatCapsuleForResponse(
    capsule: Capsule,
    includeMessage: boolean = true
  ) {
    return {
      id: capsule._id.toString(),
      title: capsule.title,
      location: capsule.location,
      createdAt: capsule.createdAt,
      visibility: capsule.visibility,
      unlockConditions: capsule.unlockConditions,
      ...(includeMessage && { message: capsule.message }),
    };
  }
  