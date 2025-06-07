-- Insert sample pet uploads for demo users
INSERT INTO pet_uploads (user_id, original_file_name, stored_file_name, file_path, mime_type, file_size, image_width, image_height, pet_name, expected_pet_type, description, tags, verification_status, capsule_unlocked, capsule_unlocked_at, metadata) VALUES 

-- Demo user - successful unlock
('demo-user', 'my_dog_buddy.jpg', '1704067200000-abc123def456.jpg', './uploads/pets/1704067200000-abc123def456.jpg', 'image/jpeg', 2048576, 1920, 1080, 'Buddy', 'dog', 'My golden retriever playing in the park', ARRAY['golden-retriever', 'park', 'playing'], 'approved', true, CURRENT_TIMESTAMP - INTERVAL '2 hours', 
 '{"uploadSource": "web", "deviceInfo": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)", "ipAddress": "192.168.1.100"}'
),

-- Test user - pending review
('test-user-1', 'fluffy_cat.png', '1704070800000-def789ghi012.png', './uploads/pets/1704070800000-def789ghi012.png', 'image/png', 1536000, 1280, 960, 'Fluffy', 'cat', 'My Persian cat sleeping on the couch', ARRAY['persian', 'sleeping', 'couch'], 'needs_review', false, NULL,
 '{"uploadSource": "mobile", "deviceInfo": "Android 13", "ipAddress": "192.168.1.101"}'
),

-- Test user - rejected upload
('test-user-2', 'bird_photo.jpg', '1704074400000-ghi345jkl678.jpg', './uploads/pets/1704074400000-ghi345jkl678.jpg', 'image/jpeg', 3072000, 2048, 1536, 'Tweety', 'bird', 'My canary in its cage', ARRAY['canary', 'cage', 'yellow'], 'rejected', false, NULL,
 '{"uploadSource": "web", "deviceInfo": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "ipAddress": "192.168.1.102"}'
),

-- Another demo user upload
('demo-user-2', 'rabbit_luna.jpg', '1704078000000-jkl901mno234.jpg', './uploads/pets/1704078000000-jkl901mno234.jpg', 'image/jpeg', 1792000, 1600, 1200, 'Luna', 'rabbit', 'My Holland Lop rabbit eating carrots', ARRAY['holland-lop', 'carrots', 'eating'], 'approved', true, CURRENT_TIMESTAMP - INTERVAL '1 hour',
 '{"uploadSource": "web", "deviceInfo": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "ipAddress": "192.168.1.103"}'
);

-- Insert sample pet classifications
INSERT INTO pet_classifications (upload_id, predicted_pet_type, confidence, all_predictions, processing_time_ms, model_version, model_provider, is_active, technical_details) VALUES 

-- Demo user's dog classification
((SELECT id FROM pet_uploads WHERE stored_file_name = '1704067200000-abc123def456.jpg'), 
 'dog', 0.9234, 
 '[
   {"petType": "dog", "confidence": 0.9234},
   {"petType": "other", "confidence": 0.0456},
   {"petType": "cat", "confidence": 0.0234},
   {"petType": "rabbit", "confidence": 0.0076}
 ]'::jsonb,
 1250, '1.0.0', 'tensorflow', true,
 '{"imagePreprocessing": "resize_224x224_normalize", "modelInputs": {"imageSize": "224x224x3"}}'::jsonb
),

-- Test user's cat classification (low confidence)
((SELECT id FROM pet_uploads WHERE stored_file_name = '1704070800000-def789ghi012.png'), 
 'cat', 0.6789, 
 '[
   {"petType": "cat", "confidence": 0.6789},
   {"petType": "other", "confidence": 0.2345},
   {"petType": "dog", "confidence": 0.0567},
   {"petType": "rabbit", "confidence": 0.0299}
 ]'::jsonb,
 1890, '1.0.0', 'tensorflow', true,
 '{"imagePreprocessing": "resize_224x224_normalize", "modelInputs": {"imageSize": "224x224x3"}}'::jsonb
),

-- Test user's bird classification (rejected)
((SELECT id FROM pet_uploads WHERE stored_file_name = '1704074400000-ghi345jkl678.jpg'), 
 'other', 0.5432, 
 '[
   {"petType": "other", "confidence": 0.5432},
   {"petType": "bird", "confidence": 0.3456},
   {"petType": "cat", "confidence": 0.0678},
   {"petType": "dog", "confidence": 0.0434}
 ]'::jsonb,
 2100, '1.0.0', 'fallback', true,
 '{"imagePreprocessing": "resize_224x224_normalize", "modelInputs": {"imageSize": "224x224x3"}}'::jsonb
),

-- Demo user 2's rabbit classification
((SELECT id FROM pet_uploads WHERE stored_file_name = '1704078000000-jkl901mno234.jpg'), 
 'rabbit', 0.8765, 
 '[
   {"petType": "rabbit", "confidence": 0.8765},
   {"petType": "cat", "confidence": 0.0987},
   {"petType": "other", "confidence": 0.0234},
   {"petType": "hamster", "confidence": 0.0014}
 ]'::jsonb,
 1456, '1.0.0', 'tensorflow', true,
 '{"imagePreprocessing": "resize_224x224_normalize", "modelInputs": {"imageSize": "224x224x3"}}'::jsonb
);

-- Insert sample manual verifications
INSERT INTO manual_verifications (upload_id, reviewer_id, decision, review_notes, corrected_pet_type, confidence_override, review_time_seconds, review_metadata) VALUES 

-- Manual approval for cat photo
((SELECT id FROM pet_uploads WHERE stored_file_name = '1704070800000-def789ghi012.png'), 
 'reviewer-001', 'approved', 'Clear image of a Persian cat. ML confidence was low due to lighting, but definitely a cat.', 'cat', 0.95, 45,
 '{"reviewerExperience": "expert", "reviewDifficulty": 2, "flaggedIssues": ["low_lighting"]}'::jsonb
),

-- Manual rejection for bird photo
((SELECT id FROM pet_uploads WHERE stored_file_name = '1704074400000-ghi345jkl678.jpg'), 
 'reviewer-002', 'rejected', 'Image shows a toy bird, not a real pet. Please upload a photo of a live animal.', NULL, NULL, 30,
 '{"reviewerExperience": "intermediate", "reviewDifficulty": 1, "flaggedIssues": ["toy_not_real_pet"]}'::jsonb
);

-- Insert sample pet capsule unlocks
INSERT INTO pet_capsule_unlocks (user_id, upload_id, pet_type, final_confidence, unlock_method, unlocked_at, unlock_details) VALUES 

-- Demo user's dog unlock
('demo-user', 
 (SELECT id FROM pet_uploads WHERE stored_file_name = '1704067200000-abc123def456.jpg'),
 'dog', 0.9234, 'auto_ml', CURRENT_TIMESTAMP - INTERVAL '2 hours',
 '{
   "classificationId": "' || (SELECT id FROM pet_classifications WHERE upload_id = (SELECT id FROM pet_uploads WHERE stored_file_name = '1704067200000-abc123def456.jpg')) || '",
   "processingTime": 1250,
   "reviewTime": null
 }'::jsonb
),

-- Demo user 2's rabbit unlock
('demo-user-2', 
 (SELECT id FROM pet_uploads WHERE stored_file_name = '1704078000000-jkl901mno234.jpg'),
 'rabbit', 0.8765, 'auto_ml', CURRENT_TIMESTAMP - INTERVAL '1 hour',
 '{
   "classificationId": "' || (SELECT id FROM pet_classifications WHERE upload_id = (SELECT id FROM pet_uploads WHERE stored_file_name = '1704078000000-jkl901mno234.jpg')) || '",
   "processingTime": 1456,
   "reviewTime": null
 }'::jsonb
);

-- Insert some additional sample data for variety
INSERT INTO pet_uploads (user_id, original_file_name, stored_file_name, file_path, mime_type, file_size, image_width, image_height, pet_name, expected_pet_type, description, tags, verification_status, metadata) VALUES 

('test-user-3', 'hamster_peanut.jpg', '1704081600000-mno567pqr890.jpg', './uploads/pets/1704081600000-mno567pqr890.jpg', 'image/jpeg', 1024000, 1024, 768, 'Peanut', 'hamster', 'My Syrian hamster in his wheel', ARRAY['syrian', 'wheel', 'exercise'], 'pending',
 '{"uploadSource": "mobile", "deviceInfo": "iOS 16.0", "ipAddress": "192.168.1.104"}'
),

('test-user-4', 'goldfish_nemo.jpg', '1704085200000-pqr123stu456.jpg', './uploads/pets/1704085200000-pqr123stu456.jpg', 'image/jpeg', 2560000, 1800, 1350, 'Nemo', 'fish', 'My goldfish swimming in the tank', ARRAY['goldfish', 'tank', 'swimming'], 'needs_review',
 '{"uploadSource": "web", "deviceInfo": "Mozilla/5.0 (Linux; Android 12)", "ipAddress": "192.168.1.105"}'
);

-- Insert classifications for the additional uploads
INSERT INTO pet_classifications (upload_id, predicted_pet_type, confidence, all_predictions, processing_time_ms, model_version, model_provider, is_active) VALUES 

((SELECT id FROM pet_uploads WHERE stored_file_name = '1704081600000-mno567pqr890.jpg'), 
 'hamster', 0.7890, 
 '[
   {"petType": "hamster", "confidence": 0.7890},
   {"petType": "rabbit", "confidence": 0.1234},
   {"petType": "other", "confidence": 0.0567},
   {"petType": "cat", "confidence": 0.0309}
 ]'::jsonb,
 1678, '1.0.0', 'tensorflow', true
),

((SELECT id FROM pet_uploads WHERE stored_file_name = '1704085200000-pqr123stu456.jpg'), 
 'fish', 0.6543, 
 '[
   {"petType": "fish", "confidence": 0.6543},
   {"petType": "other", "confidence": 0.2876},
   {"petType": "bird", "confidence": 0.0345},
   {"petType": "reptile", "confidence": 0.0236}
 ]'::jsonb,
 2234, '1.0.0', 'fallback', true
);
