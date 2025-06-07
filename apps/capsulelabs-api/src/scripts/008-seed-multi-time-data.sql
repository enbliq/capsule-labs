-- Insert sample timezone settings for demo users
INSERT INTO timezone_settings (user_id, selected_time_zones, target_hour, is_active, metadata) VALUES 

('demo-user', 
 ARRAY['Africa/Lagos', 'Europe/London', 'Asia/Kolkata'], 
 15, 
 true,
 '{"timeZoneLabels": {"Africa/Lagos": "Nigeria (WAT)", "Europe/London": "United Kingdom (GMT/BST)", "Asia/Kolkata": "India (IST)"}}'
),

('test-user-1', 
 ARRAY['America/New_York', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'], 
 12, 
 true,
 '{"timeZoneLabels": {"America/New_York": "US Eastern (EST/EDT)", "Europe/Paris": "France (CET/CEST)", "Asia/Tokyo": "Japan (JST)", "Australia/Sydney": "Australia Eastern (AEST/AEDT)"}}'
),

('test-user-2', 
 ARRAY['America/Los_Angeles', 'Europe/Berlin', 'Asia/Dubai', 'Africa/Cairo', 'Asia/Singapore'], 
 9, 
 true,
 '{"timeZoneLabels": {"America/Los_Angeles": "US Pacific (PST/PDT)", "Europe/Berlin": "Germany (CET/CEST)", "Asia/Dubai": "UAE (GST)", "Africa/Cairo": "Egypt (EET)", "Asia/Singapore": "Singapore (SGT)"}}'
);

-- Insert sample access attempts
INSERT INTO timezone_access_attempts (user_id, time_zone, access_time, local_hour, local_time_string, utc_offset, is_valid_attempt, session_id, metadata) VALUES 

-- Demo user - successful session
('demo-user', 'Africa/Lagos', CURRENT_TIMESTAMP - INTERVAL '2 hours', 15, '15:30:00', '+01:00', true, 'session-1', 
 '{"location": "Lagos, Nigeria", "deviceInfo": "iPhone 14", "targetHour": 15}'
),
('demo-user', 'Europe/London', CURRENT_TIMESTAMP - INTERVAL '1 hour 45 minutes', 15, '15:15:00', '+00:00', true, 'session-1', 
 '{"location": "London, UK", "deviceInfo": "iPhone 14", "targetHour": 15}'
),
('demo-user', 'Asia/Kolkata', CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes', 15, '15:00:00', '+05:30', true, 'session-1', 
 '{"location": "Mumbai, India", "deviceInfo": "iPhone 14", "targetHour": 15}'
),

-- Test user - failed attempts
('test-user-1', 'America/New_York', CURRENT_TIMESTAMP - INTERVAL '3 hours', 11, '11:45:00', '-05:00', false, 'session-2', 
 '{"location": "New York, USA", "deviceInfo": "Android", "targetHour": 12}'
),
('test-user-1', 'America/New_York', CURRENT_TIMESTAMP - INTERVAL '2 hours 30 minutes', 12, '12:30:00', '-05:00', true, 'session-2', 
 '{"location": "New York, USA", "deviceInfo": "Android", "targetHour": 12}'
),
('test-user-1', 'Europe/Paris', CURRENT_TIMESTAMP - INTERVAL '2 hours', 12, '12:00:00', '+01:00', true, 'session-2', 
 '{"location": "Paris, France", "deviceInfo": "Android", "targetHour": 12}'
);

-- Insert sample unlock sessions
INSERT INTO timezone_unlock_sessions (id, user_id, target_hour, required_time_zones, completed_time_zones, session_start_time, session_end_time, status, capsule_unlocked, capsule_unlocked_at, session_timeout_minutes, unlock_data) VALUES 

('session-1', 'demo-user', 15, 
 ARRAY['Africa/Lagos', 'Europe/London', 'Asia/Kolkata'], 
 ARRAY['Africa/Lagos', 'Europe/London', 'Asia/Kolkata'], 
 CURRENT_TIMESTAMP - INTERVAL '2 hours 15 minutes',
 CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes',
 'completed', 
 true, 
 CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes',
 60,
 '{"accessAttempts": ["attempt-1", "attempt-2", "attempt-3"], "completionOrder": ["Africa/Lagos", "Europe/London", "Asia/Kolkata"], "totalDuration": 45}'
),

('session-2', 'test-user-1', 12, 
 ARRAY['America/New_York', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'], 
 ARRAY['America/New_York', 'Europe/Paris'], 
 CURRENT_TIMESTAMP - INTERVAL '3 hours',
 NULL,
 'active', 
 false, 
 NULL,
 60,
 '{"accessAttempts": ["attempt-4", "attempt-5"], "completionOrder": ["America/New_York", "Europe/Paris"], "totalDuration": null}'
),

('session-3', 'test-user-2', 9, 
 ARRAY['America/Los_Angeles', 'Europe/Berlin', 'Asia/Dubai'], 
 ARRAY[], 
 CURRENT_TIMESTAMP - INTERVAL '4 hours',
 CURRENT_TIMESTAMP - INTERVAL '3 hours',
 'expired', 
 false, 
 NULL,
 60,
 '{"accessAttempts": [], "completionOrder": [], "totalDuration": null}'
);

-- Insert sample capsule unlocks
INSERT INTO timezone_capsule_unlocks (user_id, session_id, unlocked_at_hour, time_zones_used, unlocked_at, total_attempts, session_duration_minutes, unlock_details) VALUES 

('demo-user', 'session-1', 15, 
 ARRAY['Africa/Lagos', 'Europe/London', 'Asia/Kolkata'], 
 CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes',
 3, 
 45,
 '{
   "accessOrder": ["Africa/Lagos", "Europe/London", "Asia/Kolkata"],
   "timingDetails": {
     "sessionStart": "2024-01-15T13:00:00Z",
     "sessionEnd": "2024-01-15T13:45:00Z",
     "targetHour": 15
   },
   "achievements": ["Quick Traveler - Unlocked in under 15 minutes", "Continental Connector - Spanned 3+ continents"]
 }'
);

-- Insert some additional sample data for variety
INSERT INTO timezone_access_attempts (user_id, time_zone, access_time, local_hour, local_time_string, utc_offset, is_valid_attempt, session_id, metadata) VALUES 

('test-user-2', 'America/Los_Angeles', CURRENT_TIMESTAMP - INTERVAL '5 hours', 8, '08:30:00', '-08:00', false, 'session-4', 
 '{"location": "Los Angeles, USA", "deviceInfo": "MacBook Pro", "targetHour": 9}'
),
('test-user-2', 'Europe/Berlin', CURRENT_TIMESTAMP - INTERVAL '4 hours 30 minutes', 9, '09:15:00', '+01:00', true, 'session-4', 
 '{"location": "Berlin, Germany", "deviceInfo": "MacBook Pro", "targetHour": 9}'
),
('test-user-2', 'Asia/Dubai', CURRENT_TIMESTAMP - INTERVAL '4 hours', 9, '09:00:00', '+04:00', true, 'session-4', 
 '{"location": "Dubai, UAE", "deviceInfo": "MacBook Pro", "targetHour": 9}'
);

-- Update session-4 to be completed
INSERT INTO timezone_unlock_sessions (id, user_id, target_hour, required_time_zones, completed_time_zones, session_start_time, session_end_time, status, capsule_unlocked, capsule_unlocked_at, session_timeout_minutes, unlock_data) VALUES 

('session-4', 'test-user-2', 9, 
 ARRAY['America/Los_Angeles', 'Europe/Berlin', 'Asia/Dubai'], 
 ARRAY['Europe/Berlin', 'Asia/Dubai'], 
 CURRENT_TIMESTAMP - INTERVAL '5 hours',
 CURRENT_TIMESTAMP - INTERVAL '4 hours',
 'active', 
 false, 
 NULL,
 60,
 '{"accessAttempts": ["attempt-6", "attempt-7", "attempt-8"], "completionOrder": ["Europe/Berlin", "Asia/Dubai"], "totalDuration": null}'
);
