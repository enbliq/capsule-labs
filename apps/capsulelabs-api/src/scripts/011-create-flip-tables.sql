-- Create flip_sessions table
CREATE TABLE IF NOT EXISTS flip_sessions (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    required_duration INTEGER NOT NULL,
    is_complete BOOLEAN DEFAULT false,
    capsule_unlocked BOOLEAN DEFAULT false,
    capsule_unlocked_at TIMESTAMP WITH TIME ZONE,
    device_info JSONB,
    orientation_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create flip_attempts table
CREATE TABLE IF NOT EXISTS flip_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    attempt_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms INTEGER NOT NULL,
    was_successful BOOLEAN DEFAULT false,
    orientation_data JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create flip_capsule_unlocks table
CREATE TABLE IF NOT EXISTS flip_capsule_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_id UUID NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_attempts INTEGER NOT NULL,
    session_duration_seconds INTEGER NOT NULL,
    unlock_details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create flip_challenge_config table
CREATE TABLE IF NOT EXISTS flip_challenge_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    required_duration INTEGER DEFAULT 30000,
    beta_threshold FLOAT DEFAULT 150,
    gamma_threshold FLOAT DEFAULT 0,
    stability_threshold FLOAT DEFAULT 15,
    require_absolute_sensors BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flip_sessions_user ON flip_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_flip_sessions_complete ON flip_sessions(is_complete);
CREATE INDEX IF NOT EXISTS idx_flip_sessions_unlocked ON flip_sessions(capsule_unlocked);

CREATE INDEX IF NOT EXISTS idx_flip_attempts_session ON flip_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_flip_attempts_user ON flip_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_flip_attempts_time ON flip_attempts(attempt_time);

CREATE INDEX IF NOT EXISTS idx_flip_unlocks_user ON flip_capsule_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_flip_unlocks_time ON flip_capsule_unlocks(unlocked_at);

CREATE INDEX IF NOT EXISTS idx_flip_config_active ON flip_challenge_config(is_active);

-- Add foreign key constraints
ALTER TABLE flip_attempts ADD CONSTRAINT fk_flip_attempts_session 
    FOREIGN KEY (session_id) REFERENCES flip_sessions(id) ON DELETE CASCADE;

ALTER TABLE flip_capsule_unlocks ADD CONSTRAINT fk_flip_unlocks_session 
    FOREIGN KEY (session_id) REFERENCES flip_sessions(id) ON DELETE CASCADE;

-- Create triggers for updated_at
CREATE TRIGGER update_flip_sessions_updated_at 
    BEFORE UPDATE ON flip_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flip_challenge_config_updated_at 
    BEFORE UPDATE ON flip_challenge_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
