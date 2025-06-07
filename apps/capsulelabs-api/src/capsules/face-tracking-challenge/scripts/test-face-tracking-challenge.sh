#!/bin/bash

echo "Testing Face Tracking Challenge Implementation"
echo "============================================="

BASE_URL="http://localhost:3000"
FACE_TRACKING_URL="$BASE_URL/face-tracking-challenge"

echo "Testing face tracking challenge on: $FACE_TRACKING_URL"
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

# Test 1: Create a face tracking session
echo "=== Test 1: Create Face Tracking Session ==="
make_request "POST" "$FACE_TRACKING_URL/create" '{
    "userId": "test-user",
    "settings": {
        "requiredDuration": 10000,
        "centerTolerance": 0.2,
        "minConfidence": 0.7,
        "maxRotation": 15,
        "minFaceSize": 0.1,
        "maxFaceSize": 0.8,
        "allowMultipleFaces": false,
        "stabilityThreshold": 1000
    }
}' "Create a new face tracking session"

# Test 2: Start the face tracking session
echo "=== Test 2: Start Face Tracking Session ==="
make_request "POST" "$FACE_TRACKING_URL/$SESSION_ID/start" "" "Start the face tracking session"

# Test 3: Get session status
echo "=== Test 3: Get Session Status ==="
make_request "GET" "$FACE_TRACKING_URL/$SESSION_ID/status" "" "Get the current session status"

# Test 4: Process valid face detection
echo "=== Test 4: Process Valid Face Detection ==="
make_request "POST" "$FACE_TRACKING_URL/$SESSION_ID/detection" '{
    "detections": [{
        "confidence": 0.95,
        "position": {
            "x": 0.5,
            "y": 0.5,
            "width": 0.3,
            "height": 0.4,
            "rotation": 0,
            "distance": 0.5
        },
        "landmarks": {
            "leftEye": {"x": 0.45, "y": 0.45},
            "rightEye": {"x": 0.55, "y": 0.45},
            "nose": {"x": 0.5, "y": 0.5},
            "mouth": {"x": 0.5, "y": 0.55}
        }
    }]
}' "Process a valid centered face detection"

# Test 5: Process off-center face detection
echo "=== Test 5: Process Off-Center Face Detection ==="
make_request "POST" "$FACE_TRACKING_URL/$SESSION_ID/detection" '{
    "detections": [{
        "confidence": 0.90,
        "position": {
            "x": 0.8,
            "y": 0.5,
            "width": 0.3,
            "height": 0.4,
            "rotation": 0,
            "distance": 0.5
        }
    }]
}' "Process an off-center face detection"

# Test 6: Process low confidence detection
echo "=== Test 6: Process Low Confidence Detection ==="
make_request "POST" "$FACE_TRACKING_URL/$SESSION_ID/detection" '{
    "detections": [{
        "confidence": 0.5,
        "position": {
            "x": 0.5,
            "y": 0.5,
            "width": 0.3,
            "height": 0.4,
            "rotation": 0,
            "distance": 0.5
        }
    }]
}' "Process a low confidence face detection"

# Test 7: Process rotated face detection
echo "=== Test 7: Process Rotated Face Detection ==="
make_request "POST" "$FACE_TRACKING_URL/$SESSION_ID/detection" '{
    "detections": [{
        "confidence": 0.95,
        "position": {
            "x": 0.5,
            "y": 0.5,
            "width": 0.3,
            "height": 0.4,
            "rotation": 25,
            "distance": 0.5
        }
    }]
}' "Process a rotated face detection"

# Test 8: Process no face detection
echo "=== Test 8: Process No Face Detection ==="
make_request "POST" "$FACE_TRACKING_URL/$SESSION_ID/detection" '{
    "detections": []
}' "Process frame with no face detected"

# Test 9: Process multiple faces
echo "=== Test 9: Process Multiple Faces ==="
make_request "POST" "$FACE_TRACKING_URL/$SESSION_ID/detection" '{
    "detections": [
        {
            "confidence": 0.95,
            "position": {
                "x": 0.3,
                "y": 0.5,
                "width": 0.2,
                "height": 0.3,
                "rotation": 0,
                "distance": 0.5
            }
        },
        {
            "confidence": 0.90,
            "position": {
                "x": 0.7,
                "y": 0.5,
                "width": 0.2,
                "height": 0.3,
                "rotation": 0,
                "distance": 0.5
            }
        }
    ]
}' "Process frame with multiple faces"

# Test 10: Get updated session status
echo "=== Test 10: Get Updated Session Status ==="
make_request "GET" "$FACE_TRACKING_URL/$SESSION_ID/status" "" "Get the updated session status"

# Test 11: Simulate successful tracking sequence
echo "=== Test 11: Simulate Successful Tracking Sequence ==="
echo "Sending multiple valid detections to simulate successful tracking..."

for i in {1..15}; do
    make_request "POST" "$FACE_TRACKING_URL/$SESSION_ID/detection" '{
        "detections": [{
            "confidence": 0.95,
            "position": {
                "x": 0.5,
                "y": 0.5,
                "width": 0.3,
                "height": 0.4,
                "rotation": 0,
                "distance": 0.5
            },
            "landmarks": {
                "leftEye": {"x": 0.45, "y": 0.45},
                "rightEye": {"x": 0.55, "y": 0.45},
                "nose": {"x": 0.5, "y": 0.5},
                "mouth": {"x": 0.5, "y": 0.55}
            }
        }]
    }' "Valid detection #$i"
    
    # Small delay between detections
    sleep 0.1
done

# Test 12: Check final session status
echo "=== Test 12: Check Final Session Status ==="
make_request "GET" "$FACE_TRACKING_URL/$SESSION_ID/status" "" "Check if session completed"

# Test 13: Get user sessions
echo "=== Test 13: Get User Sessions ==="
make_request "GET" "$FACE_TRACKING_URL/user/test-user/sessions" "" "Get all sessions for the user"

# Test 14: Get user statistics
echo "=== Test 14: Get User Statistics ==="
make_request "GET" "$FACE_TRACKING_URL/user/test-user/statistics" "" "Get face tracking statistics for the user"

# Test 15: Create and test a short session for quick completion
echo "=== Test 15: Create Short Session for Quick Completion ==="
make_request "POST" "$FACE_TRACKING_URL/create" '{
    "userId": "test-user",
    "settings": {
        "requiredDuration": 2000,
        "centerTolerance": 0.3,
        "stabilityThreshold": 500
    }
}' "Create a short session for quick completion test"

# Start the short session
echo "=== Starting Short Session ==="
make_request "POST" "$FACE_TRACKING_URL/$SESSION_ID/start" "" "Start the short session"

# Send rapid valid detections
echo "Sending rapid valid detections..."
for i in {1..25}; do
    curl -s -X POST \
         -H "Content-Type: application/json" \
         -d '{
             "detections": [{
                 "confidence": 0.95,
                 "position": {
                     "x": 0.5,
                     "y": 0.5,
                     "width": 0.3,
                     "height": 0.4,
                     "rotation": 0,
                     "distance": 0.5
                 }
             }]
         }' \
         "$FACE_TRACKING_URL/$SESSION_ID/detection" > /dev/null
    sleep 0.1
done

# Check if session completed
echo "=== Check Auto-Completed Session ==="
make_request "GET" "$FACE_TRACKING_URL/user/test-user/statistics" "" "Check if session completed automatically"

echo ""
echo "Face tracking challenge tests completed!"
echo ""
echo "Expected behavior:"
echo "- Test 1 should create a new face tracking session"
echo "- Test 2 should start the session"
echo "- Test 4 should process valid face detection successfully"
echo "- Tests 5-9 should detect various violations (off-center, low confidence, rotation, no face, multiple faces)"
echo "- Test 11 should simulate successful tracking with multiple valid detections"
echo "- Tests 13-14 should show user session history and statistics"
echo "- Test 15 should create and auto-complete a short session"
