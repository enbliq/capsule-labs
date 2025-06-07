-- Create sense_tasks table
CREATE TABLE IF NOT EXISTS sense_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sense VARCHAR(20) NOT NULL CHECK (sense IN ('sight', 'hearing', 'smell', 'taste', 'touch')),
    task_type VARCHAR(30) NOT NULL CHECK (task_type IN (
        'qr_scan', 'sound_record', 'photo_capture', 'voice_command', 
        'gesture_detect', 'color_identify', 'pattern_match', 'vibration_detect'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_sense_progress table
CREATE TABLE IF NOT EXISTS user_sense_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    daily_tasks JSONB NOT NULL,
    capsule_unlocked BOOLEAN DEFAULT false,
    capsule_unlocked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sense_tasks_sense_type ON sense_tasks(sense, task_type);
CREATE INDEX IF NOT EXISTS idx_sense_tasks_active ON sense_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_date ON user_sense_progress(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_progress_capsule ON user_sense_progress(capsule_unlocked);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_sense_tasks_updated_at 
    BEFORE UPDATE ON sense_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sense_progress_updated_at 
    BEFORE UPDATE ON user_sense_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
