-- Insert default timesync configuration
INSERT INTO timesync_config (
    id,
    daily_pulse_time,
    pulse_time_zone,
    sync_window_ms,
    max_network_latency,
    enable_ntp_sync,
    enable_daily_pulses,
    is_active,
    description,
    advanced_settings
) VALUES (
    gen_random_uuid(),
    '12:00:00',
    'UTC',
    3000,
    5000,
    true,
    true,
    true,
    'Default TimeSync Configuration - Daily pulse at 12:00 UTC with ±3 second window',
    '{
        "ntpServers": ["pool.ntp.org", "time.google.com"],
        "timeDriftThreshold": 1000,
        "maxSyncAttempts": 3,
        "pulsePreannounceMs": 30000
    }'
);

-- Insert sample sync pulses (recent ones)
INSERT INTO sync_pulses (
    id,
    scheduled_time,
    actual_broadcast_time,
    window_start_ms,
    window_end_ms,
    is_active,
    description,
    metadata
) VALUES (
    '12345678-1234-5678-9abc-123456789001',
    CURRENT_DATE + TIME '12:00:00',
    CURRENT_DATE + TIME '12:00:00.050',
    3000,
    3000,
    false,
    'Daily Sync Pulse',
    '{
        "broadcastDelay": 50,
        "connectedClients": 15,
        "totalAttempts": 12,
        "successfulAttempts": 8
    }'
);

INSERT INTO sync_pulses (
    id,
    scheduled_time,
    actual_broadcast_time,
    window_start_ms,
    window_end_ms,
    is_active,
    description,
    metadata
) VALUES (
    '12345678-1234-5678-9abc-123456789002',
    CURRENT_DATE - INTERVAL '1 day' + TIME '12:00:00',
    CURRENT_DATE - INTERVAL '1 day' + TIME '12:00:00.025',
    3000,
    3000,
    false,
    'Daily Sync Pulse',
    '{
        "broadcastDelay": 25,
        "connectedClients": 18,
        "totalAttempts": 15,
        "successfulAttempts": 11
    }'
);

-- Insert sample sync attempts
INSERT INTO sync_attempts (
    user_id,
    pulse_id,
    client_timestamp,
    server_timestamp,
    pulse_scheduled_time,
    time_difference,
    allowed_window,
    within_window,
    was_successful,
    network_latency,
    time_zone,
    device_info,
    ntp_data
) VALUES (
    'demo-user',
    '12345678-1234-5678-9abc-123456789001',
    CURRENT_DATE + TIME '12:00:01.500',
    CURRENT_DATE + TIME '12:00:01.520',
    CURRENT_DATE + TIME '12:00:00',
    1500,
    6000,
    true,
    true,
    20,
    'America/New_York',
    '{"userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)", "platform": "iPhone"}',
    '{"clockOffset": -15, "roundTripTime": 45, "ntpSyncTime": "2024-01-15T11:59:30.000Z"}'
);

INSERT INTO sync_attempts (
    user_id,
    pulse_id,
    client_timestamp,
    server_timestamp,
    pulse_scheduled_time,
    time_difference,
    allowed_window,
    within_window,
    was_successful,
    network_latency,
    time_zone,
    device_info
) VALUES (
    'test-user-1',
    '12345678-1234-5678-9abc-123456789001',
    CURRENT_DATE + TIME '12:00:04.200',
    CURRENT_DATE + TIME '12:00:04.250',
    CURRENT_DATE + TIME '12:00:00',
    4200,
    6000,
    false,
    false,
    50,
    'Europe/London',
    '{"userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "platform": "Win32"}'
);

INSERT INTO sync_attempts (
    user_id,
    pulse_id,
    client_timestamp,
    server_timestamp,
    pulse_scheduled_time,
    time_difference,
    allowed_window,
    within_window,
    was_successful,
    network_latency,
    time_zone,
    device_info,
    ntp_data
) VALUES (
    'test-user-2',
    '12345678-1234-5678-9abc-123456789002',
    CURRENT_DATE - INTERVAL '1 day' + TIME '11:59:59.800',
    CURRENT_DATE - INTERVAL '1 day' + TIME '11:59:59.830',
    CURRENT_DATE - INTERVAL '1 day' + TIME '12:00:00',
    200,
    6000,
    true,
    true,
    30,
    'Asia/Tokyo',
    '{"userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", "platform": "MacIntel"}',
    '{"clockOffset": 5, "roundTripTime": 60, "ntpSyncTime": "2024-01-14T11:58:45.000Z"}'
);

-- Insert sample capsule unlocks
INSERT INTO timesync_capsule_unlocks (
    user_id,
    pulse_id,
    successful_attempt_id,
    unlocked_at,
    total_attempts,
    timing_accuracy,
    unlock_details
) VALUES (
    'demo-user',
    '12345678-1234-5678-9abc-123456789001',
    (SELECT id FROM sync_attempts WHERE user_id = 'demo-user' AND was_successful = true LIMIT 1),
    CURRENT_DATE + TIME '12:00:01.520',
    3,
    1500,
    '{
        "pulseScheduledTime": "2024-01-15T12:00:00.000Z",
        "clientTimestamp": "2024-01-15T12:00:01.500Z",
        "serverTimestamp": "2024-01-15T12:00:01.520Z",
        "timeDifference": 1500,
        "networkLatency": 20,
        "ntpOffset": -15
    }'
);

INSERT INTO timesync_capsule_unlocks (
    user_id,
    pulse_id,
    successful_attempt_id,
    unlocked_at,
    total_attempts,
    timing_accuracy,
    unlock_details
) VALUES (
    'test-user-2',
    '12345678-1234-5678-9abc-123456789002',
    (SELECT id FROM sync_attempts WHERE user_id = 'test-user-2' AND was_successful = true LIMIT 1),
    CURRENT_DATE - INTERVAL '1 day' + TIME '11:59:59.830',
    1,
    200,
    '{
        "pulseScheduledTime": "2024-01-14T12:00:00.000Z",
        "clientTimestamp": "2024-01-14T11:59:59.800Z",
        "serverTimestamp": "2024-01-14T11:59:59.830Z",
        "timeDifference": 200,
        "networkLatency": 30,
        "ntpOffset": 5
    }'
);

-- Insert sample NTP sync logs
INSERT INTO ntp_sync_logs (
    user_id,
    client_sent_time,
    server_received_time,
    server_sent_time,
    client_received_time,
    round_trip_time,
    clock_offset,
    metadata
) VALUES (
    'demo-user',
    CURRENT_TIMESTAMP - INTERVAL '5 minutes',
    CURRENT_TIMESTAMP - INTERVAL '5 minutes' + INTERVAL '25 milliseconds',
    CURRENT_TIMESTAMP - INTERVAL '5 minutes' + INTERVAL '26 milliseconds',
    CURRENT_TIMESTAMP - INTERVAL '5 minutes' + INTERVAL '50 milliseconds',
    50,
    -15,
    '{"userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)", "ipAddress": "192.168.1.100", "timeZone": "America/New_York"}'
);

INSERT INTO ntp_sync_logs (
    user_id,
    client_sent_time,
    server_received_time,
    server_sent_time,
    client_received_time,
    round_trip_time,
    clock_offset,
    metadata
) VALUES (
    'test-user-1',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes' + INTERVAL '30 milliseconds',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes' + INTERVAL '31 milliseconds',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes' + INTERVAL '65 milliseconds',
    65,
    8,
    '{"userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "ipAddress": "192.168.1.101", "timeZone": "Europe/London"}'
);

INSERT INTO ntp_sync_logs (
    user_id,
    client_sent_time,
    server_received_time,
    server_sent_time,
    client_received_time,
    round_trip_time,
    clock_offset,
    metadata
) VALUES (
    'test-user-2',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes' + INTERVAL '35 milliseconds',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes' + INTERVAL '36 milliseconds',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes' + INTERVAL '75 milliseconds',
    75,
    5,
    '{"userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", "ipAddress": "192.168.1.102", "timeZone": "Asia/Tokyo"}'
);
