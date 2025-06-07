-- Create pet_uploads table
CREATE TABLE IF NOT EXISTS pet_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    image_width SMALLINT,
    image_height SMALLINT,
    pet_name VARCHAR(100),
    expected_pet_type VARCHAR(20) CHECK (expected_pet_type IN ('dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other')),
    description TEXT,
    tags TEXT[],
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'needs_review')),
    capsule_unlocked BOOLEAN DEFAULT false,
    capsule_unlocked_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pet_classifications table
CREATE TABLE IF NOT EXISTS pet_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID NOT NULL,
    predicted_pet_type VARCHAR(20) NOT NULL CHECK (predicted_pet_type IN ('dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other')),
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    all_predictions JSONB NOT NULL,
    processing_time_ms SMALLINT NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    model_provider VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    technical_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create manual_verifications table
CREATE TABLE IF NOT EXISTS manual_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID NOT NULL,
    reviewer_id VARCHAR(255) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('pending', 'approved', 'rejected', 'needs_review')),
    review_notes TEXT,
    corrected_pet_type VARCHAR(20) CHECK (corrected_pet_type IN ('dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other')),
    confidence_override DECIMAL(5,4) CHECK (confidence_override >= 0 AND confidence_override <= 1),
    review_time_seconds SMALLINT NOT NULL,
    review_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pet_capsule_unlocks table
CREATE TABLE IF NOT EXISTS pet_capsule_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    upload_id UUID NOT NULL,
    pet_type VARCHAR(20) NOT NULL CHECK (pet_type IN ('dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other')),
    final_confidence DECIMAL(5,4) NOT NULL,
    unlock_method VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    unlock_details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pet_uploads_user ON pet_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_uploads_status ON pet_uploads(verification_status);
CREATE INDEX IF NOT EXISTS idx_pet_uploads_unlocked ON pet_uploads(capsule_unlocked);
CREATE INDEX IF NOT EXISTS idx_pet_uploads_created ON pet_uploads(created_at);

CREATE INDEX IF NOT EXISTS idx_pet_classifications_upload ON pet_classifications(upload_id);
CREATE INDEX IF NOT EXISTS idx_pet_classifications_active ON pet_classifications(is_active);
CREATE INDEX IF NOT EXISTS idx_pet_classifications_confidence ON pet_classifications(confidence);
CREATE INDEX IF NOT EXISTS idx_pet_classifications_pet_type ON pet_classifications(predicted_pet_type);

CREATE INDEX IF NOT EXISTS idx_manual_verifications_upload ON manual_verifications(upload_id);
CREATE INDEX IF NOT EXISTS idx_manual_verifications_reviewer ON manual_verifications(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_manual_verifications_decision ON manual_verifications(decision);

CREATE INDEX IF NOT EXISTS idx_pet_unlocks_user ON pet_capsule_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_unlocks_pet_type ON pet_capsule_unlocks(pet_type);
CREATE INDEX IF NOT EXISTS idx_pet_unlocks_unlocked_at ON pet_capsule_unlocks(unlocked_at);

-- Add foreign key constraints
ALTER TABLE pet_classifications ADD CONSTRAINT fk_pet_classifications_upload 
    FOREIGN KEY (upload_id) REFERENCES pet_uploads(id) ON DELETE CASCADE;

ALTER TABLE manual_verifications ADD CONSTRAINT fk_manual_verifications_upload 
    FOREIGN KEY (upload_id) REFERENCES pet_uploads(id) ON DELETE CASCADE;

ALTER TABLE pet_capsule_unlocks ADD CONSTRAINT fk_pet_unlocks_upload 
    FOREIGN KEY (upload_id) REFERENCES pet_uploads(id) ON DELETE CASCADE;

-- Create triggers for updated_at
CREATE TRIGGER update_pet_uploads_updated_at 
    BEFORE UPDATE ON pet_uploads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
