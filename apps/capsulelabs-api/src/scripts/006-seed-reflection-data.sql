-- Insert sample reflection prompts
INSERT INTO reflection_prompts (title, prompt, category, difficulty) VALUES

-- Gratitude prompts
('Daily Gratitude', 'What are three things you''re grateful for today?', 'gratitude', 1),
('Gratitude for People', 'Who in your life are you most thankful for and why?', 'gratitude', 2),
('Small Moments', 'What small moment today brought you unexpected joy?', 'gratitude', 1),
('Gratitude Challenge', 'What''s something you usually take for granted that you''re grateful for?', 'gratitude', 3),
('Nature''s Gifts', 'What in nature are you grateful for today?', 'gratitude', 2),

-- Growth prompts
('Learning Today', 'What did you learn about yourself today?', 'growth', 2),
('Overcoming Challenges', 'What challenge did you face today and how did you handle it?', 'growth', 3),
('Personal Growth', 'How have you grown as a person this week?', 'growth', 4),
('Mistakes and Learning', 'What mistake taught you something valuable recently?', 'growth', 3),
('Future Self', 'What would your future self thank you for doing today?', 'growth', 4),

-- Mindfulness prompts
('Present Moment', 'What did you notice about the present moment today?', 'mindfulness', 2),
('Mindful Eating', 'Describe a meal you ate mindfully today.', 'mindfulness', 2),
('Breathing Space', 'When did you take a moment to breathe deeply today?', 'mindfulness', 1),
('Sensory Awareness', 'What sounds, smells, or textures did you notice today?', 'mindfulness', 2),
('Mindful Movement', 'How did your body feel during movement today?', 'mindfulness', 3),

-- Relationships prompts
('Connection Today', 'How did you connect with someone meaningful today?', 'relationships', 2),
('Acts of Kindness', 'What act of kindness did you witness or perform today?', 'relationships', 2),
('Relationship Gratitude', 'What relationship in your life brings you the most joy?', 'relationships', 3),
('Communication', 'What meaningful conversation did you have today?', 'relationships', 3),
('Support System', 'Who supported you today and how?', 'relationships', 2),

-- Goals prompts
('Progress Today', 'What progress did you make toward your goals today?', 'goals', 3),
('Daily Intentions', 'What was your intention for today and did you honor it?', 'goals', 2),
('Future Vision', 'What step did you take today toward your ideal future?', 'goals', 4),
('Priorities', 'What was most important to you today?', 'goals', 2),
('Achievement', 'What small achievement are you proud of today?', 'goals', 1),

-- General prompts
('Highlight of the Day', 'What was the best part of your day?', 'general', 1),
('Emotional Check-in', 'How are you feeling right now and why?', 'general', 2),
('Weather and Mood', 'How did the weather affect your mood today?', 'general', 1),
('Creative Expression', 'How did you express creativity today?', 'general', 2),
('Evening Reflection', 'As you end this day, what are you most proud of?', 'general', 2);

-- Insert sample reflections for demo user
INSERT INTO daily_reflections (user_id, reflection_date, content, gratitude_note, mood, tags, word_count, character_count, metadata) VALUES

-- Demo user - building toward 7-day streak
('demo-user', CURRENT_DATE - INTERVAL '6 days', 
 'Today I felt grateful for the warm sunshine that greeted me this morning. It reminded me that even small things like weather can completely change my perspective. I also appreciated my morning coffee ritual - there''s something so grounding about that first sip. Finally, I''m thankful for my health and the ability to move my body freely.',
 'The sunshine, my coffee ritual, and my health',
 'happy',
 ARRAY['sunshine', 'coffee', 'health', 'morning'],
 67, 389,
 '{"submittedAt": "2024-01-01T08:30:00Z"}'
),

('demo-user', CURRENT_DATE - INTERVAL '5 days',
 'I had a meaningful conversation with an old friend today that reminded me how important connections are. We laughed about old memories and shared what''s happening in our lives now. It made me realize how much I value authentic relationships where you can just be yourself. I''m also grateful for technology that allows us to stay connected despite distance.',
 'Meaningful friendships and staying connected',
 'very_happy',
 ARRAY['friendship', 'connection', 'conversation', 'technology'],
 58, 342,
 '{"submittedAt": "2024-01-02T19:15:00Z"}'
),

('demo-user', CURRENT_DATE - INTERVAL '4 days',
 'Today was challenging, but I''m grateful for the lessons it taught me. I made a mistake at work, but my colleague was understanding and helped me fix it. This reminded me that everyone makes mistakes and what matters is how we handle them. I''m thankful for patient people in my life and for the opportunity to learn and grow from setbacks.',
 'Patient colleagues and learning from mistakes',
 'neutral',
 ARRAY['work', 'mistakes', 'learning', 'patience', 'growth'],
 61, 356,
 '{"submittedAt": "2024-01-03T20:45:00Z"}'
),

('demo-user', CURRENT_DATE - INTERVAL '3 days',
 'I spent time in nature today and it filled me with peace. Walking through the park, I noticed how the trees are changing with the season. There''s something magical about witnessing these natural cycles. I''m grateful for green spaces in the city and for having legs that can carry me on these walks. Nature always puts things in perspective.',
 'Nature, green spaces, and the ability to walk',
 'happy',
 ARRAY['nature', 'walking', 'trees', 'seasons', 'peace'],
 55, 321,
 '{"submittedAt": "2024-01-04T17:30:00Z"}'
),

('demo-user', CURRENT_DATE - INTERVAL '2 days',
 'Today I''m reflecting on the simple pleasure of a home-cooked meal. I made dinner from scratch and really savored each bite. It made me appreciate having access to fresh ingredients and the time to prepare food mindfully. I''m also grateful for the kitchen space I have and the skills I''ve learned over the years. Cooking can be such a meditative practice.',
 'Home-cooked meals and mindful eating',
 'happy',
 ARRAY['cooking', 'food', 'mindfulness', 'home', 'skills'],
 59, 347,
 '{"submittedAt": "2024-01-05T21:00:00Z"}'
),

('demo-user', CURRENT_DATE - INTERVAL '1 day',
 'I had a moment of pure joy today when I helped a neighbor carry groceries. Such a small act, but it reminded me how good it feels to help others. I''m grateful for the opportunity to be kind and for living in a community where people look out for each other. These little interactions make life so much richer and more meaningful.',
 'Acts of kindness and community spirit',
 'very_happy',
 ARRAY['kindness', 'community', 'helping', 'neighbors', 'joy'],
 52, 304,
 '{"submittedAt": "2024-01-06T18:45:00Z"}'
);

-- Insert sample streak data
INSERT INTO reflection_streaks (user_id, current_streak, longest_streak, total_reflections, last_reflection_date, streak_start_date, capsule_unlocked, required_streak_for_unlock, achievements) VALUES 

('demo-user', 6, 6, 6, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '6 days', false, 7, 
 '{"firstReflection": "2024-01-01", "totalWords": 352}'
),

('test-user-1', 3, 5, 8, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '3 days', false, 7,
 '{"firstReflection": "2023-12-15", "totalWords": 1240}'
),

('test-user-2', 7, 7, 7, CURRENT_DATE, CURRENT_DATE - INTERVAL '6 days', true, 7,
 '{"firstReflection": "2024-01-01", "totalWords": 2100}'
);

-- Update capsule unlock timestamp for test-user-2
UPDATE reflection_streaks 
SET capsule_unlocked_at = CURRENT_DATE + TIME '09:30:00'
WHERE user_id = 'test-user-2' AND capsule_unlocked = true;

-- Insert some additional sample reflections for test users
INSERT INTO daily_reflections (user_id, reflection_date, content, gratitude_note, mood, tags, word_count, character_count) VALUES

('test-user-1', CURRENT_DATE - INTERVAL '3 days',
 'Today I practiced gratitude for my morning routine. Having structure in my day helps me feel grounded and purposeful.',
 'My morning routine and daily structure',
 'happy',
 ARRAY['routine', 'structure', 'morning'],
 20, 118
),

('test-user-1', CURRENT_DATE - INTERVAL '2 days',
 'I''m grateful for the book I''m reading. It''s opening my mind to new perspectives and helping me grow as a person.',
 'Learning through reading',
 'neutral',
 ARRAY['reading', 'learning', 'growth'],
 22, 125
),

('test-user-1', CURRENT_DATE - INTERVAL '1 day',
 'Today brought unexpected laughter with friends. These moments of joy remind me how important it is to not take life too seriously.',
 'Laughter and friendship',
 'very_happy',
 ARRAY['laughter', 'friends', 'joy'],
 21, 123
);
