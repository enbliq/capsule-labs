#!/bin/bash

echo "Testing Meditation Challenge Implementation"
echo "=========================================="

BASE_URL="http://localhost:3000"
MEDITATION_URL="$BASE_URL/meditation-challenge"

echo "Testing meditation challenge on: $MEDITATION_URL"
echo ""

# Function to make a request and show response
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local description="$4"
    
    echo "Test: $description"
    echo "Method: $method"
    echo "URL: $url"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
                       -X "$method" \
                       -H "Content-Type: application/json" \
                       -d "$data" \
                       "$url")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
                       -X "$method" \
                       "$url")
    fi
    
    echo "Response: $response"
    echo "----------------------------------------"
    echo ""
    
    # Extract session ID if available
    if [[ "$response" == *"sessionId"* ]]; then
        SESSION_ID=$(echo "$response" | grep -o '"sessionId":"[^"]*' | sed 's/"sessionId":"//')
        echo "Extracted Session ID: $SESSION_ID"
        echo ""
    fi
}

# Test 1: Create a meditation session
echo "=== Test 1: Create Meditation Session ==="
make_request "POST" "$MEDITATION_URL/create" '{
    "userId": "test-user",
    "settings": {
        "duration": 30000,
        "allowPauses": true,
        "maxPauses": 2,
        "movementSensitivity": "medium",
        "noiseSensitivity": "low",
        "allowScreenExit": false
    }
}' "Create a new meditation session"

# Test 2: Start the meditation session
echo "=== Test 2: Start Meditation Session ==="
make_request "POST" "$MEDITATION_URL/$SESSION_ID/start" "" "Start the meditation session"

# Test 3: Get session status
echo "=== Test 3: Get Session Status ==="
make_request "GET" "$MEDITATION_URL/$SESSION_ID/status" "" "Get the current session status"

# Test 4: Record a movement interruption
echo "=== Test 4: Record Movement Interruption ==="
make_request "POST" "$MEDITATION_URL/$SESSION_ID/interruption" '{
    "type": "movement",
    "severity": "low",
    "description": "User shifted slightly"
}' "Record a low-severity movement interruption"

# Test 5: Record a noise interruption
echo "=== Test 5: Record Noise Interruption ==="
make_request "POST" "$MEDITATION_URL/$SESSION_ID/interruption" '{
    "type": "noise",
    "severity": "medium",
    "description": "Background noise detected"
}' "Record a medium-severity noise interruption"

# Test 6: Pause the session
echo "=== Test 6: Pause Session ==="
make_request "POST" "$MEDITATION_URL/$SESSION_ID/pause" '{
    "reason": "User requested pause"
}' "Pause the meditation session"

# Test 7: Resume the session
echo "=== Test 7: Resume Session ==="
make_request "POST" "$MEDITATION_URL/$SESSION_ID/resume" "" "Resume the meditation session"

# Test 8: Get updated session status
echo "=== Test 8: Get Updated Session Status ==="
make_request "GET" "$MEDITATION_URL/$SESSION_ID/status" "" "Get the updated session status"

# Test 9: End the session manually
echo "=== Test 9: End Session Manually ==="
make_request "POST" "$MEDITATION_URL/$SESSION_ID/end" "" "End the meditation session manually"

# Test 10: Get user sessions
echo "=== Test 10: Get User Sessions ==="
make_request "GET" "$MEDITATION_URL/user/test-user/sessions" "" "Get all sessions for the user"

# Test 11: Get user statistics
echo "=== Test 11: Get User Statistics ==="
make_request "GET" "$MEDITATION_URL/user/test-user/statistics" "" "Get meditation statistics for the user"

# Test 12: Create a session that will complete automatically
echo "=== Test 12: Create Short Session for Auto-Completion ==="
make_request "POST" "$MEDITATION_URL/create" '{
    "userId": "test-user",
    "settings": {
        "duration": 5000,
        "allowPauses": false,
        "autoFailOnInterruption": false
    }
}' "Create a short session for auto-completion test"

# Start the short session
echo "=== Starting Short Session ==="
make_request "POST" "$MEDITATION_URL/$SESSION_ID/start" "" "Start the short session"

echo "Waiting 6 seconds for session to complete automatically..."
sleep 6

# Check if session completed
echo "=== Check Auto-Completed Session ==="
make_request "GET" "$MEDITATION_URL/user/test-user/statistics" "" "Check if session completed automatically"

echo ""
echo "Meditation challenge tests completed!"
echo ""
echo "Expected behavior:"
echo "- Test 1 should create a new meditation session"
echo "- Test 2 should start the session"
echo "- Tests 4-5 should record interruptions without failing the session"
echo "- Tests 6-7 should pause and resume the session"
echo "- Test 9 should end the session (likely incomplete)"
echo "- Tests 10-11 should show user session history and statistics"
echo "- Test 12 should create and auto-complete a short session"
