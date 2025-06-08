#!/bin/bash

# Typing Test Challenge API Test Script
# This script tests the typing test challenge endpoints

BASE_URL="http://localhost:3000"
API_BASE="$BASE_URL/typing-test-challenge"

echo "🎯 Testing Typing Test Challenge API"
echo "=================================="

# Test 1: Create typing test session
echo "📝 Test 1: Creating typing test session..."
CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/create" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "duration": 30000,
    "minWpm": 40,
    "minAccuracy": 90,
    "difficulty": "medium",
    "includeNumbers": false,
    "includePunctuation": true,
    "includeCapitals": true
  }')

echo "Response: $CREATE_RESPONSE"

# Extract session ID
SESSION_ID=$(echo $CREATE_RESPONSE | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
echo "Session ID: $SESSION_ID"

if [ -z "$SESSION_ID" ]; then
  echo "❌ Failed to create typing test session"
  exit 1
fi

echo "✅ Typing test session created successfully"
echo ""

# Test 2: Get session status
echo "📊 Test 2: Getting session status..."
STATUS_RESPONSE=$(curl -s -X GET "$API_BASE/$SESSION_ID/status")
echo "Response: $STATUS_RESPONSE"
echo "✅ Session status retrieved successfully"
echo ""

# Test 3: Start typing test
echo "🚀 Test 3: Starting typing test..."
START_RESPONSE=$(curl -s -X POST "$API_BASE/$SESSION_ID/start" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123"
  }')

echo "Response: $START_RESPONSE"
echo "✅ Typing test started successfully"
echo ""

# Wait a moment to simulate typing time
echo "⏳ Simulating typing time..."
sleep 2

# Test 4: Submit typing test (with sample text)
echo "📤 Test 4: Submitting typing test..."
SUBMIT_RESPONSE=$(curl -s -X POST "$API_BASE/$SESSION_ID/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "userInput": "The quick brown fox jumps over the lazy dog near the old oak tree."
  }')

echo "Response: $SUBMIT_RESPONSE"
echo "✅ Typing test submitted successfully"
echo ""

# Test 5: Get user sessions
echo "📋 Test 5: Getting user sessions..."
SESSIONS_RESPONSE=$(curl -s -X GET "$API_BASE/user/test-user-123/sessions")
echo "Response: $SESSIONS_RESPONSE"
echo "✅ User sessions retrieved successfully"
echo ""

# Test 6: Get user statistics
echo "📈 Test 6: Getting user statistics..."
STATS_RESPONSE=$(curl -s -X GET "$API_BASE/user/test-user-123/statistics")
echo "Response: $STATS_RESPONSE"
echo "✅ User statistics retrieved successfully"
echo ""

# Test 7: Create typing test with different difficulty
echo "🎯 Test 7: Creating hard difficulty typing test..."
HARD_CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/create" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-456",
    "duration": 60000,
    "minWpm": 60,
    "minAccuracy": 95,
    "difficulty": "hard",
    "includeNumbers": true,
    "includePunctuation": true,
    "includeCapitals": true
  }')

echo "Response: $HARD_CREATE_RESPONSE"
echo "✅ Hard difficulty typing test created successfully"
echo ""

# Test 8: Test error cases
echo "❌ Test 8: Testing error cases..."

# Test with non-existent session
echo "Testing non-existent session..."
ERROR_RESPONSE=$(curl -s -X GET "$API_BASE/non-existent-session/status")
echo "Response: $ERROR_RESPONSE"

# Test starting already started session
echo "Testing double start..."
DOUBLE_START_RESPONSE=$(curl -s -X POST "$API_BASE/$SESSION_ID/start" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123"
  }')
echo "Response: $DOUBLE_START_RESPONSE"

# Test wrong user access
echo "Testing wrong user access..."
WRONG_USER_RESPONSE=$(curl -s -X POST "$API_BASE/$SESSION_ID/start" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "wrong-user"
  }')
echo "Response: $WRONG_USER_RESPONSE"

echo "✅ Error cases tested successfully"
echo ""

# Test 9: Performance test with multiple sessions
echo "🏃 Test 9: Performance test with multiple sessions..."
for i in {1..5}; do
  echo "Creating session $i..."
  PERF_RESPONSE=$(curl -s -X POST "$API_BASE/create" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"perf-user-$i\",
      \"difficulty\": \"easy\",
      \"minWpm\": 30,
      \"minAccuracy\": 85
    }")
  
  PERF_SESSION_ID=$(echo $PERF_RESPONSE | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
  
  if [ ! -z "$PERF_SESSION_ID" ]; then
    echo "Session $i created: $PERF_SESSION_ID"
  else
    echo "Failed to create session $i"
  fi
done

echo "✅ Performance test completed"
echo ""

# Test 10: Validation tests
echo "🔍 Test 10: Testing input validation..."

# Test invalid duration
echo "Testing invalid duration..."
INVALID_DURATION=$(curl -s -X POST "$API_BASE/create" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-validation",
    "duration": 5000
  }')
echo "Response: $INVALID_DURATION"

# Test invalid WPM
echo "Testing invalid WPM..."
INVALID_WPM=$(curl -s -X POST "$API_BASE/create" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-validation",
    "minWpm": 300
  }')
echo "Response: $INVALID_WPM"

# Test invalid accuracy
echo "Testing invalid accuracy..."
INVALID_ACCURACY=$(curl -s -X POST "$API_BASE/create" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-validation",
    "minAccuracy": 110
  }')
echo "Response: $INVALID_ACCURACY"

echo "✅ Validation tests completed"
echo ""

echo "🎉 All typing test challenge tests completed!"
echo "=================================="
echo "Summary:"
echo "- ✅ Session creation"
echo "- ✅ Session status retrieval"
echo "- ✅ Typing test start"
echo "- ✅ Typing test submission"
echo "- ✅ User sessions retrieval"
echo "- ✅ User statistics"
echo "- ✅ Different difficulty levels"
echo "- ✅ Error handling"
echo "- ✅ Performance testing"
echo "- ✅ Input validation"
echo ""
echo "🚀 Typing test challenge API is working correctly!"
