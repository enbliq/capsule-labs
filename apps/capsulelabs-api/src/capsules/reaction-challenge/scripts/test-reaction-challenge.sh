#!/bin/bash

echo "Testing Reaction Challenge Implementation"
echo "========================================"

BASE_URL="http://localhost:3000"
CHALLENGE_URL="$BASE_URL/reaction-challenge"

echo "Testing reaction challenge on: $CHALLENGE_URL"
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
    
    # Extract challenge ID if available
    if [[ "$response" == *"challengeId"* ]]; then
        CHALLENGE_ID=$(echo "$response" | grep -o '"challengeId":"[^"]*' | sed 's/"challengeId":"//')
        echo "Extracted Challenge ID: $CHALLENGE_ID"
        echo ""
    fi
}

# Test 1: Create a challenge
echo "=== Test 1: Create Challenge ==="
make_request "POST" "$CHALLENGE_URL/create" '{"userId":"test-user","triggerType":"visual"}' "Create a new challenge"

# Test 2: Generate a trigger
echo "=== Test 2: Generate Trigger ==="
make_request "POST" "$CHALLENGE_URL/$CHALLENGE_ID/trigger" "" "Generate a trigger for the challenge"

# Wait for the trigger to be generated (using the delay from the response)
DELAY=$(echo "$response" | grep -o '"delay":[0-9]*' | sed 's/"delay"://')
echo "Waiting for $DELAY milliseconds for the trigger to be generated..."
sleep $(echo "scale=3; $DELAY/1000" | bc)

# Test 3: Get challenge status
echo "=== Test 3: Get Challenge Status ==="
make_request "GET" "$CHALLENGE_URL/$CHALLENGE_ID/status" "" "Get the status of the challenge"

# Test 4: React to the trigger (too slow)
echo "=== Test 4: React to Trigger (Too Slow) ==="
# Wait a bit to ensure we're outside the reaction window
sleep 0.5
TIMESTAMP=$(date +%s%3N)
make_request "POST" "$CHALLENGE_URL/$CHALLENGE_ID/react" "{\"timestamp\":$TIMESTAMP}" "React to the trigger (too slow)"

# Test 5: Generate another trigger
echo "=== Test 5: Generate Another Trigger ==="
make_request "POST" "$CHALLENGE_URL/$CHALLENGE_ID/trigger" "" "Generate another trigger for the challenge"

# Wait for the trigger to be generated
DELAY=$(echo "$response" | grep -o '"delay":[0-9]*' | sed 's/"delay"://')
echo "Waiting for $DELAY milliseconds for the trigger to be generated..."
sleep $(echo "scale=3; $DELAY/1000" | bc)

# Test 6: React to the trigger (on time)
echo "=== Test 6: React to Trigger (On Time) ==="
# React immediately
TIMESTAMP=$(date +%s%3N)
make_request "POST" "$CHALLENGE_URL/$CHALLENGE_ID/react" "{\"timestamp\":$TIMESTAMP}" "React to the trigger (on time)"

echo ""
echo "Reaction challenge tests completed!"
echo ""
echo "Expected behavior:"
echo "- Test 1 should create a new challenge"
echo "- Test 2 should generate a trigger after a random delay"
echo "- Test 3 should show the challenge status as 'triggered'"
echo "- Test 4 should fail because the reaction is too slow"
echo "- Test 5 should generate another trigger"
echo "- Test 6 should succeed if the reaction is within the window"
