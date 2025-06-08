-- Create sync_pulses table
CREATE TABLE IF NOT EXISTS sync_pulses (
    id UUID PRIMARY KEY,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_broadcast_time TIMESTAMP WITH TIME ZONE NOT NULL,
    window_start_ms INTEGER DEFAULT 3000,
    window_end_ms INTEGER DEFAULT 3000,
    is_active BOOLEAN DEFAULT true,
    description VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sync_attempts table
CREATE TABLE IF NOT EXISTS sync_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    pulse_id UUID NOT NULL,
    client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    server_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    pulse_scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    time_difference INTEGER NOT NULL,
    allowed_window INTEGER DEFAULT 3000,
    within_window BOOLEAN DEFAULT false,
    was_successful BOOLEAN DEFAULT false,
    network_latency INTEGER,
    time_zone VARCHAR(100),
    device_info JSONB,
    ntp_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create timesync_capsule_unlocks table
CREATE TABLE IF NOT EXISTS timesync_capsule_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    pulse_id UUID NOT NULL,
    successful_attempt_id UUID NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_attempts INTEGER NOT NULL,
    timing_accuracy INTEGER NOT NULL,
    unlock_details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ntp_sync_logs table
CREATE TABLE IF NOT EXISTS ntp_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    client_sent_time TIMESTAMP WITH TIME ZONE NOT NULL,
    server_received_time TIMESTAMP WITH TIME ZONE NOT NULL,
    server_sent_time TIMESTAMP WITH TIME ZONE NOT NULL,
    client_received_time TIMESTAMP WITH TIME ZONE NOT NULL,
    round_trip_time INTEGER NOT NULL,
    clock_offset INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create timesync_config table
CREATE TABLE IF NOT EXISTS timesync_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_pulse_time VARCHAR(8) DEFAULT '12:00:00',
    pulse_time_zone VARCHAR(50) DEFAULT 'UTC',
    sync_window_ms INTEGER DEFAULT 3000,
    max_network_latency INTEGER DEFAULT 5000,
    enable_ntp_sync BOOLEAN DEFAULT true,
    enable_daily_pulses BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    advanced_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sync_pulses_scheduled_time ON sync_pulses(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_sync_pulses_active ON sync_pulses(is_active);

CREATE INDEX IF NOT EXISTS idx_sync_attempts_user ON sync_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_attempts_pulse ON sync_attempts(pulse_id);
CREATE INDEX IF NOT EXISTS idx_sync_attempts_within_window ON sync_attempts(within_window);
CREATE INDEX IF NOT EXISTS idx_sync_attempts_successful ON sync_attempts(was_successful);
CREATE INDEX IF NOT EXISTS idx_sync_attempts_time ON sync_attempts(client_timestamp);

CREATE INDEX IF NOT EXISTS idx_timesync_unlocks_user ON timesync_capsule_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_timesync_unlocks_time ON timesync_capsule_unlocks(unlocked_at);

CREATE INDEX IF NOT EXISTS idx_ntp_logs_user ON ntp_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ntp_logs_time ON ntp_sync_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_timesync_config_active ON timesync_config(is_active);

-- Add foreign key constraints
ALTER TABLE sync_attempts ADD CONSTRAINT fk_sync_attempts_pulse 
    FOREIGN KEY (pulse_id) REFERENCES sync_pulses(id) ON DELETE CASCADE;

ALTER TABLE timesync_capsule_unlocks ADD CONSTRAINT fk_timesync_unlocks_pulse 
    FOREIGN KEY (pulse_id) REFERENCES sync_pulses(id) ON DELETE CASCADE;

ALTER TABLE timesync_capsule_unlocks ADD CONSTRAINT fk_timesync_unlocks_attempt 
    FOREIGN KEY (successful_attempt_id) REFERENCES sync_attempts(id) ON DELETE CASCADE;

-- Create triggers for updated_at
CREATE TRIGGER update_sync_pulses_updated_at 
    BEFORE UPDATE ON sync_pulses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timesync_config_updated_at 
    BEFORE UPDATE ON timesync_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
