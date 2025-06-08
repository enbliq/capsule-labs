-- Create alarm_settings table
CREATE TABLE IF NOT EXISTS alarm_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    target_hour SMALLINT NOT NULL CHECK (target_hour >= 0 AND target_hour <= 23),
    target_minute SMALLINT NOT NULL CHECK (target_minute >= 0 AND target_minute <= 59),
    grace_window_minutes SMALLINT DEFAULT 10 CHECK (grace_window_minutes > 0),
    required_streak SMALLINT DEFAULT 3 CHECK (required_streak > 0),
    enable_push_notifications BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create wake_up_logs table
CREATE TABLE IF NOT EXISTS wake_up_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    target_wake_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_wake_time TIMESTAMP WITH TIME ZONE,
    alarm_response_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'on_time', 'late', 'missed', 'manual')),
    wake_method VARCHAR(20) CHECK (wake_method IN ('alarm', 'manual', 'notification', 'snooze')),
    minutes_late SMALLINT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Create alarm_streaks table
CREATE TABLE IF NOT EXISTS alarm_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    current_streak SMALLINT DEFAULT 0,
    longest_streak SMALLINT DEFAULT 0,
    total_successful_days SMALLINT DEFAULT 0,
    total_attempts SMALLINT DEFAULT 0,
    last_success_date DATE,
    streak_start_date DATE,
    capsule_unlocked BOOLEAN DEFAULT false,
    capsule_unlocked_at TIMESTAMP WITH TIME ZONE,
    required_streak_for_unlock SMALLINT DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alarm_settings_user_active ON alarm_settings(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_alarm_settings_time ON alarm_settings(target_hour, target_minute) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_wake_up_logs_user_date ON wake_up_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_wake_up_logs_status ON wake_up_logs(status);
CREATE INDEX IF NOT EXISTS idx_wake_up_logs_target_time ON wake_up_logs(target_wake_time);

CREATE INDEX IF NOT EXISTS idx_alarm_streaks_user ON alarm_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_alarm_streaks_capsule ON alarm_streaks(capsule_unlocked);

-- Create triggers for updated_at
CREATE TRIGGER update_alarm_settings_updated_at 
    BEFORE UPDATE ON alarm_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wake_up_logs_updated_at 
    BEFORE UPDATE ON wake_up_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alarm_streaks_updated_at 
    BEFORE UPDATE ON alarm_streaks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
