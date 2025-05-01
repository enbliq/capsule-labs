/**
 * Unlock Engine for SecretDrop
 * Validates if a user can unlock a capsule based on distance and time conditions
 */

/**
 * Calculate the distance between two points on Earth using the Haversine formula
 * @param {Number} lat1 First latitude in decimal degrees
 * @param {Number} lon1 First longitude in decimal degrees
 * @param {Number} lat2 Second latitude in decimal degrees
 * @param {Number} lon2 Second longitude in decimal degrees
 * @returns {Number} Distance in meters
 */
function calculateDistance(lat1:any, lon1:any, lat2:any, lon2:any) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return R * c; // Distance in meters
  }
  
  /**
   * Check if a capsule is within the unlock distance from user
   * @param {Object} capsule The capsule with location data
   * @param {Array} userLocation User location as [longitude, latitude]
   * @returns {Object} Result with distance and pass/fail status
   */
  function checkDistanceCondition(capsule:any, userLocation:any) {
    // Extract coordinates
    const [userLng, userLat] = userLocation;
    const capsuleLng = capsule.location.coordinates[0];
    const capsuleLat = capsule.location.coordinates[1];
  
    // Calculate distance between user and capsule
    const distance = calculateDistance(userLat, userLng, capsuleLat, capsuleLng);
  
    // Check if user is within unlock distance
    const withinDistance = distance <= capsule.unlockConditions.distance;
  
    return {
      pass: withinDistance,
      distance,
      required: capsule.unlockConditions.distance,
      reason: withinDistance
        ? null
        : `You're ${Math.round(
            distance - capsule.unlockConditions.distance
          )} meters too far from the capsule`,
    };
  }
  
  /**
   * Check if current time falls within capsule's time window
   * @param {Object} capsule The capsule with time window data
   * @returns {Object} Result with time info and pass/fail status
   */
  function checkTimeCondition(capsule:any) {
    // If no time window is specified, consider it always valid
    if (
      !capsule.unlockConditions.timeWindow?.start &&
      !capsule.unlockConditions.timeWindow?.end
    ) {
      return { pass: true };
    }
  
    const now = new Date();
    const startTime = capsule.unlockConditions.timeWindow?.start;
    const endTime = capsule.unlockConditions.timeWindow?.end;
  
    // Check if current time falls within window
    let withinTimeWindow = true;
    let reason = null;
  
    if (startTime && now < startTime) {
      withinTimeWindow = false;
      reason = `Capsule unlocks at ${startTime.toLocaleString()}`;
    }
  
    if (endTime && now > endTime) {
      withinTimeWindow = false;
      reason = `Capsule expired at ${endTime.toLocaleString()}`;
    }
  
    return {
      pass: withinTimeWindow,
      current: now,
      start: startTime,
      end: endTime,
      reason,
    };
  }
  
  /**
   * Check if capsule has reached its max unlock limit
   * @param {Object} capsule The capsule with visibility settings
   * @returns {Object} Result with unlock count info and pass/fail status
   */
  function checkUnlockLimit(capsule:any) {
    // If no max unlocks is set, consider it always valid
    if (!capsule.visibility.maxUnlocks) {
      return { pass: true };
    }
  
    const belowLimit = capsule.unlockCount < capsule.visibility.maxUnlocks;
  
    return {
      pass: belowLimit,
      current: capsule.unlockCount,
      limit: capsule.visibility.maxUnlocks,
      reason: belowLimit ? null : 'Maximum unlock limit reached',
    };
  }
  
  /**
   * Check if capsule has expired based on TTL
   * @param {Object} capsule The capsule with TTL settings
   * @returns {Object} Result with TTL info and pass/fail status
   */
  function checkTTL(capsule:any) {
    // If no TTL is set, consider it always valid
    if (!capsule.visibility.ttlHours) {
      return { pass: true };
    }
  
    const createdAt = new Date(capsule.createdAt);
    const expiresAt = new Date(
      createdAt.getTime() + capsule.visibility.ttlHours * 60 * 60 * 1000
    );
    const now = new Date();
  
    const notExpired = now < expiresAt;
  
    return {
      pass: notExpired,
      expiresAt,
      reason: notExpired ? null : 'Capsule has expired',
    };
  }
  
  /**
   * Validate if a user can unlock a capsule
   * @param {Object} capsule The capsule to check
   * @param {Array} userLocation User location as [longitude, latitude]
   * @returns {Object} Complete validation result
   */
  export function validateUnlock(capsule:any, userLocation:any) {
    // Check each condition
    const distanceCheck = checkDistanceCondition(capsule, userLocation);
    const timeCheck = checkTimeCondition(capsule);
    const unlockLimitCheck = checkUnlockLimit(capsule);
    const ttlCheck = checkTTL(capsule);
  
    // Combine all checks
    const canUnlock =
      distanceCheck.pass &&
      timeCheck.pass &&
      unlockLimitCheck.pass &&
      ttlCheck.pass;
  
    // Get the first failure reason (if any)
    let reason = null;
    if (!distanceCheck.pass) reason = distanceCheck.reason;
    else if (!timeCheck.pass) reason = timeCheck.reason;
    else if (!unlockLimitCheck.pass) reason = unlockLimitCheck.reason;
    else if (!ttlCheck.pass) reason = ttlCheck.reason;
  
    return {
      canUnlock,
      reason,
      details: {
        distance: distanceCheck,
        time: timeCheck,
        unlockLimit: unlockLimitCheck,
        ttl: ttlCheck,
      },
    };
  }
  
  module.exports = {
    calculateDistance,
    validateUnlock,
  };