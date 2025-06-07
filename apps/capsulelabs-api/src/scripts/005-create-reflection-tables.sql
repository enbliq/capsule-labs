-- Create daily_reflections table
CREATE TABLE IF NOT EXISTS daily_reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    reflection_date DATE NOT NULL,
    content TEXT NOT NULL,
    gratitude_note TEXT,
    mood VARCHAR(20) CHECK (mood IN ('very_happy', 'happy', 'neutral', 'sad', 'very_sad')),
    tags TEXT[],
    word_count SMALLINT NOT NULL,
    character_count SMALLINT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    last_edited_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, reflection_date)
);

-- Create reflection_streaks table
CREATE TABLE IF NOT EXISTS reflection_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    current_streak SMALLINT DEFAULT 0,
    longest_streak SMALLINT DEFAULT 0,
    total_reflections SMALLINT DEFAULT 0,
    last_reflection_date DATE,
    streak_start_date DATE,
    capsule_unlocked BOOLEAN DEFAULT false,
    capsule_unlocked_at TIMESTAMP WITH TIME ZONE,
    required_streak_for_unlock SMALLINT DEFAULT 7,
    achievements JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reflection_prompts table
CREATE TABLE IF NOT EXISTS reflection_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('gratitude', 'growth', 'mindfulness', 'goals', 'relationships', 'general')),
    is_active BOOLEAN DEFAULT true,
    difficulty SMALLINT DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_reflections_user_date ON daily_reflections(user_id, reflection_date);
CREATE INDEX IF NOT EXISTS idx_daily_reflections_date ON daily_reflections(reflection_date);
CREATE INDEX IF NOT EXISTS idx_daily_reflections_mood ON daily_reflections(mood);
CREATE INDEX IF NOT EXISTS idx_daily_reflections_word_count ON daily_reflections(word_count);

CREATE INDEX IF NOT EXISTS idx_reflection_streaks_user ON reflection_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_reflection_streaks_capsule ON reflection_streaks(capsule_unlocked);
CREATE INDEX IF NOT EXISTS idx_reflection_streaks_current ON reflection_streaks(current_streak);

CREATE INDEX IF NOT EXISTS idx_reflection_prompts_category ON reflection_prompts(category, is_active);
CREATE INDEX IF NOT EXISTS idx_reflection_prompts_active ON reflection_prompts(is_active);

-- Create triggers for updated_at
CREATE TRIGGER update_daily_reflections_updated_at 
    BEFORE UPDATE ON daily_reflections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reflection_streaks_updated_at 
    BEFORE UPDATE ON reflection_streaks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reflection_prompts_updated_at 
    BEFORE UPDATE ON reflection_prompts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
