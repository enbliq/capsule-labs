-- Create timezone_settings table
CREATE TABLE IF NOT EXISTS timezone_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    selected_time_zones TEXT[] NOT NULL,
    target_hour SMALLINT CHECK (target_hour >= 0 AND target_hour <= 23),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create timezone_access_attempts table
CREATE TABLE IF NOT EXISTS timezone_access_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    time_zone VARCHAR(100) NOT NULL,
    access_time TIMESTAMP WITH TIME ZONE NOT NULL,
    local_hour SMALLINT NOT NULL CHECK (local_hour >= 0 AND local_hour <= 23),
    local_time_string VARCHAR(20) NOT NULL,
    utc_offset VARCHAR(10) NOT NULL,
    is_valid_attempt BOOLEAN DEFAULT false,
    session_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create timezone_unlock_sessions table
CREATE TABLE IF NOT EXISTS timezone_unlock_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    target_hour SMALLINT NOT NULL CHECK (target_hour >= 0 AND target_hour <= 23),
    required_time_zones TEXT[] NOT NULL,
    completed_time_zones TEXT[] DEFAULT '{}',
    session_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    session_end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'failed')),
    capsule_unlocked BOOLEAN DEFAULT false,
    capsule_unlocked_at TIMESTAMP WITH TIME ZONE,
    session_timeout_minutes SMALLINT DEFAULT 60,
    unlock_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create timezone_capsule_unlocks table
CREATE TABLE IF NOT EXISTS timezone_capsule_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    unlocked_at_hour SMALLINT NOT NULL CHECK (unlocked_at_hour >= 0 AND unlocked_at_hour <= 23),
    time_zones_used TEXT[] NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_attempts SMALLINT NOT NULL,
    session_duration_minutes SMALLINT NOT NULL,
    unlock_details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timezone_settings_user_active ON timezone_settings(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_timezone_attempts_user ON timezone_access_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_timezone_attempts_timezone ON timezone_access_attempts(time_zone);
CREATE INDEX IF NOT EXISTS idx_timezone_attempts_time ON timezone_access_attempts(access_time);
CREATE INDEX IF NOT EXISTS idx_timezone_attempts_valid ON timezone_access_attempts(is_valid_attempt);
CREATE INDEX IF NOT EXISTS idx_timezone_attempts_session ON timezone_access_attempts(session_id);

CREATE INDEX IF NOT EXISTS idx_timezone_sessions_user ON timezone_unlock_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_timezone_sessions_status ON timezone_unlock_sessions(status);
CREATE INDEX IF NOT EXISTS idx_timezone_sessions_start_time ON timezone_unlock_sessions(session_start_time);

CREATE INDEX IF NOT EXISTS idx_timezone_unlocks_user ON timezone_capsule_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_timezone_unlocks_hour ON timezone_capsule_unlocks(unlocked_at_hour);
CREATE INDEX IF NOT EXISTS idx_timezone_unlocks_time ON timezone_capsule_unlocks(unlocked_at);

-- Create triggers for updated_at
CREATE TRIGGER update_timezone_settings_updated_at 
    BEFORE UPDATE ON timezone_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timezone_unlock_sessions_updated_at 
    BEFORE UPDATE ON timezone_unlock_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
