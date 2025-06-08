-- Insert default flip challenge configuration
INSERT INTO flip_challenge_config (
    id, 
    required_duration, 
    beta_threshold, 
    gamma_threshold, 
    stability_threshold, 
    require_absolute_sensors, 
    is_active, 
    name, 
    description
) VALUES (
    gen_random_uuid(),
    30000, -- 30 seconds
    150,   -- Beta angle threshold
    0,     -- Gamma angle threshold
    15,    -- Stability threshold
    false, -- Don't require absolute sensors
    true,  -- Active configuration
    'Default Configuration',
    'Standard flip challenge: Hold phone upside down for 30 seconds'
);

-- Insert alternative configurations (inactive)
INSERT INTO flip_challenge_config (
    id, 
    required_duration, 
    beta_threshold, 
    gamma_threshold, 
    stability_threshold, 
    require_absolute_sensors, 
    is_active, 
    name, 
    description
) VALUES (
    gen_random_uuid(),
    15000, -- 15 seconds
    150,   -- Beta angle threshold
    0,     -- Gamma angle threshold
    20,    -- More lenient stability threshold
    false, -- Don't require absolute sensors
    false, -- Inactive configuration
    'Easy Mode',
    'Easier flip challenge: Hold phone upside down for 15 seconds with more movement allowed'
);

INSERT INTO flip_challenge_config (
    id, 
    required_duration, 
    beta_threshold, 
    gamma_threshold, 
    stability_threshold, 
    require_absolute_sensors, 
    is_active, 
    name, 
    description
) VALUES (
    gen_random_uuid(),
    60000, -- 60 seconds
    160,   -- Stricter beta angle threshold
    0,     -- Gamma angle threshold
    10,    -- Stricter stability threshold
    false, -- Don't require absolute sensors
    false, -- Inactive configuration
    'Hard Mode',
    'Harder flip challenge: Hold phone upside down for 60 seconds with less movement allowed'
);

-- Insert sample flip sessions for demo users
INSERT INTO flip_sessions (
    id,
    user_id,
    start_time,
    end_time,
    required_duration,
    is_complete,
    capsule_unlocked,
    capsule_unlocked_at,
    device_info,
    orientation_data
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000',
    'demo-user',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP - INTERVAL '59 minutes',
    30000,
    true,
    true,
    CURRENT_TIMESTAMP - INTERVAL '59 minutes',
    '{"deviceType": "iPhone", "browser": "Safari", "operatingSystem": "iOS 16.0"}',
    '{"initialOrientation": {"alpha": 0, "beta": 0, "gamma": 0}, "finalOrientation": {"alpha": 180, "beta": 175, "gamma": 0}, "orientationChanges": 5}'
);

INSERT INTO flip_sessions (
    id,
    user_id,
    start_time,
    end_time,
    required_duration,
    is_complete,
    capsule_unlocked,
    device_info,
    orientation_data
) VALUES (
    '223e4567-e89b-12d3-a456-426614174001',
    'test-user-1',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 hour 58 minutes',
    30000,
    false,
    false,
    '{"deviceType": "Android", "browser": "Chrome", "operatingSystem": "Android 13"}',
    '{"initialOrientation": {"alpha": 0, "beta": 0, "gamma": 0}, "finalOrientation": {"alpha": 90, "beta": 100, "gamma": 10}, "orientationChanges": 8}'
);

-- Insert sample flip attempts
INSERT INTO flip_attempts (
    session_id,
    user_id,
    attempt_time,
    duration_ms,
    was_successful,
    orientation_data,
    metadata
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000',
    'demo-user',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    5000,
    false,
    '{"startOrientation": {"alpha": 0, "beta": 0, "gamma": 0}, "endOrientation": {"alpha": 90, "beta": 100, "gamma": 10}, "maxDeviation": {"alpha": 90, "beta": 100, "gamma": 10}}',
    '{"deviceType": "iPhone", "browser": "Safari", "operatingSystem": "iOS 16.0"}'
);

INSERT INTO flip_attempts (
    session_id,
    user_id,
    attempt_time,
    duration_ms,
    was_successful,
    orientation_data,
    metadata
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000',
    'demo-user',
    CURRENT_TIMESTAMP - INTERVAL '59 minutes 30 seconds',
    30000,
    true,
    '{"startOrientation": {"alpha": 0, "beta": 0, "gamma": 0}, "endOrientation": {"alpha": 180, "beta": 175, "gamma": 0}, "maxDeviation": {"alpha": 180, "beta": 175, "gamma": 5}}',
    '{"deviceType": "iPhone", "browser": "Safari", "operatingSystem": "iOS 16.0"}'
);

INSERT INTO flip_attempts (
    session_id,
    user_id,
    attempt_time,
    duration_ms,
    was_successful,
    orientation_data,
    metadata
) VALUES (
    '223e4567-e89b-12d3-a456-426614174001',
    'test-user-1',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    15000,
    false,
    '{"startOrientation": {"alpha": 0, "beta": 0, "gamma": 0}, "endOrientation": {"alpha": 90, "beta": 100, "gamma": 10}, "maxDeviation": {"alpha": 90, "beta": 100, "gamma": 10}}',
    '{"deviceType": "Android", "browser": "Chrome", "operatingSystem": "Android 13"}'
);

-- Insert sample capsule unlocks
INSERT INTO flip_capsule_unlocks (
    user_id,
    session_id,
    unlocked_at,
    total_attempts,
    session_duration_seconds,
    unlock_details
) VALUES (
    'demo-user',
    '123e4567-e89b-12d3-a456-426614174000',
    CURRENT_TIMESTAMP - INTERVAL '59 minutes',
    2,
    60,
    '{"deviceInfo": {"deviceType": "iPhone", "browser": "Safari", "operatingSystem": "iOS 16.0"}, "orientationData": {"initialOrientation": {"alpha": 0, "beta": 0, "gamma": 0}, "finalOrientation": {"alpha": 180, "beta": 175, "gamma": 0}, "orientationChanges": 5}}'
);
