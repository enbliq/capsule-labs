-- Seed default sense tasks
INSERT INTO sense_tasks (sense, task_type, title, description, metadata) VALUES

-- SIGHT tasks
('sight', 'qr_scan', 'Scan the Mystery Code', 'Find and scan any QR code in your environment', '{"requiredPattern": "any"}'),
('sight', 'qr_scan', 'Secret Message Hunt', 'Scan a QR code that contains text', '{"requiredPattern": ".*"}'),
('sight', 'photo_capture', 'Colorful Moment', 'Take a photo of something with at least 3 different colors', '{"minColors": 3}'),
('sight', 'photo_capture', 'Nature Focus', 'Capture a photo of something from nature', '{"category": "nature"}'),
('sight', 'color_identify', 'Color Detective', 'Identify the dominant color around you', '{"targetColors": ["red", "blue", "green", "yellow", "purple", "orange"]}'),
('sight', 'pattern_match', 'Pattern Master', 'Find and match a geometric pattern', '{"minAccuracy": 0.8}'),

-- HEARING tasks
('hearing', 'sound_record', 'Ambient Collector', 'Record 5 seconds of ambient sound around you', '{"duration": 5, "minDecibels": 30}'),
('hearing', 'sound_record', 'Music Moment', 'Record a snippet of music or melody', '{"duration": 3, "category": "music"}'),
('hearing', 'voice_command', 'Magic Words', 'Say the phrase "Unlock my senses" clearly', '{"phrase": "Unlock my senses"}'),
('hearing', 'voice_command', 'Voice Activation', 'Speak any word clearly for voice recognition', '{"phrase": ""}'),

-- TOUCH tasks
('touch', 'gesture_detect', 'Swipe Master', 'Perform a swipe gesture on your device', '{"gestureType": "swipe", "direction": "any"}'),
('touch', 'gesture_detect', 'Tap Rhythm', 'Perform a double-tap gesture', '{"gestureType": "tap", "count": 2}'),
('touch', 'vibration_detect', 'Feel the Beat', 'Detect the device vibration pattern', '{"pattern": [100, 200, 100]}'),
('touch', 'vibration_detect', 'Pulse Reader', 'Feel and confirm the vibration sequence', '{"pattern": [200, 100, 200]}'),

-- SMELL tasks (using photo capture as proxy)
('smell', 'photo_capture', 'Aromatic Capture', 'Take a photo of something with a distinct smell (food, flowers, etc.)', '{"category": "aromatic"}'),
('smell', 'photo_capture', 'Scent Memory', 'Photograph something that reminds you of a specific scent', '{"category": "scent_memory"}'),

-- TASTE tasks (using photo capture as proxy)
('taste', 'photo_capture', 'Flavor Focus', 'Photograph your next meal or drink', '{"category": "food_drink"}'),
('taste', 'photo_capture', 'Sweet Moment', 'Take a photo of something sweet', '{"category": "sweet"}');
