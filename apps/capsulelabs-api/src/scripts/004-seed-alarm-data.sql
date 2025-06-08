-- Insert sample alarm settings for demo user
INSERT INTO alarm_settings (user_id, target_hour, target_minute, grace_window_minutes, required_streak, enable_push_notifications, timezone, is_active) 
VALUES 
('demo-user', 6, 0, 10, 3, true, 'UTC', true),
('test-user-1', 7, 30, 15, 3, true, 'America/New_York', true),
('test-user-2', 5, 45, 5, 5, false, 'Europe/London', true);

-- Insert sample wake-up logs for demo purposes
INSERT INTO wake_up_logs (user_id, date, target_wake_time, actual_wake_time, status, wake_method, minutes_late, metadata)
VALUES 
-- Demo user - successful streak
('demo-user', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '3 days' + TIME '06:00:00', CURRENT_DATE - INTERVAL '3 days' + TIME '05:58:00', 'on_time', 'alarm', 0, '{"loggedAt": "2024-01-01T06:00:00Z"}'),
('demo-user', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days' + TIME '06:00:00', CURRENT_DATE - INTERVAL '2 days' + TIME '06:05:00', 'on_time', 'alarm', 5, '{"loggedAt": "2024-01-02T06:05:00Z"}'),
('demo-user', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day' + TIME '06:00:00', CURRENT_DATE - INTERVAL '1 day' + TIME '06:02:00', 'on_time', 'manual', 2, '{"loggedAt": "2024-01-03T06:02:00Z"}'),

-- Test user with mixed results
('test-user-1', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days' + TIME '07:30:00', CURRENT_DATE - INTERVAL '5 days' + TIME '07:25:00', 'on_time', 'alarm', 0, '{"loggedAt": "2024-01-01T07:25:00Z"}'),
('test-user-1', CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE - INTERVAL '4 days' + TIME '07:30:00', CURRENT_DATE - INTERVAL '4 days' + TIME '07:50:00', 'late', 'manual', 20, '{"loggedAt": "2024-01-02T07:50:00Z"}'),
('test-user-1', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '3 days' + TIME '07:30:00', NULL, 'missed', NULL, NULL, '{}'),
('test-user-1', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days' + TIME '07:30:00', CURRENT_DATE - INTERVAL '2 days' + TIME '07:28:00', 'on_time', 'alarm', 0, '{"loggedAt": "2024-01-04T07:28:00Z"}'),
('test-user-1', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day' + TIME '07:30:00', CURRENT_DATE - INTERVAL '1 day' + TIME '07:35:00', 'on_time', 'alarm', 5, '{"loggedAt": "2024-01-05T07:35:00Z"}');

-- Insert sample streak data
INSERT INTO alarm_streaks (user_id, current_streak, longest_streak, total_successful_days, total_attempts, last_success_date, streak_start_date, capsule_unlocked, required_streak_for_unlock)
VALUES 
('demo-user', 3, 5, 8, 12, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '3 days', true, 3),
('test-user-1', 2, 3, 5, 10, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '2 days', false, 3),
('test-user-2', 0, 1, 2, 5, CURRENT_DATE - INTERVAL '5 days', NULL, false, 5);

-- Update capsule unlock timestamp for demo user
UPDATE alarm_streaks 
SET capsule_unlocked_at = CURRENT_DATE - INTERVAL '1 day' + TIME '06:02:00'
WHERE user_id = 'demo-user' AND capsule_unlocked = true;
