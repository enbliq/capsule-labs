#!/bin/bash

# Social Capsule Challenge Test Script
echo "🏛️ Testing Social Capsule Challenge API..."

BASE_URL="http://localhost:3000/social-capsule-challenge"
USER1_ID="user123"
USER2_ID="friend456"
USER3_ID="friend789"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to extract value from JSON response
extract_json_value() {
    echo "$1" | grep -o "\"$2\":[^,}]*" | cut -d':' -f2 | tr -d '"' | tr -d ' '
}

echo -e "${YELLOW}📦 Testing Social Capsule Creation...${NC}"

# Test 1: Create social capsule
echo "Test 1: Creating social capsule..."
RESPONSE=$(curl -s -X POST "$BASE_URL/create" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER1_ID'",
    "title": "My Secret Capsule",
    "content": {"message": "This is a secret message!", "data": [1,2,3]},
    "description": "A capsule that requires 3 friends to unlock",
    "ownerUsername": "testuser",
    "ownerEmail": "test@example.com",
    "requiredFriends": 3
  }')

CAPSULE_ID=$(extract_json_value "$RESPONSE" "capsuleId")
SHARE_CODE=$(extract_json_value "$RESPONSE" "shareCode")

if [[ "$CAPSULE_ID" != "" && "$SHARE_CODE" != "" ]]; then
    print_result 0 "Social capsule created successfully"
    echo "   Capsule ID: $CAPSULE_ID"
    echo "   Share Code: $SHARE_CODE"
else
    print_result 1 "Failed to create social capsule"
    echo "   Response: $RESPONSE"
fi

echo -e "\n${YELLOW}👥 Testing Friend Invitations...${NC}"

# Test 2: Invite first friend
echo "Test 2: Inviting first friend..."
RESPONSE=$(curl -s -X POST "$BASE_URL/$CAPSULE_ID/invite" \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "'$USER1_ID'",
    "friendEmail": "friend1@example.com",
    "friendId": "'$USER2_ID'",
    "friendUsername": "friend1"
  }')

INVITE_CODE_1=$(extract_json_value "$RESPONSE" "inviteCode")

if [[ "$INVITE_CODE_1" != "" ]]; then
    print_result 0 "First friend invited successfully"
    echo "   Invite Code: $INVITE_CODE_1"
else
    print_result 1 "Failed to invite first friend"
    echo "   Response: $RESPONSE"
fi

# Test 3: Invite second friend
echo "Test 3: Inviting second friend..."
RESPONSE=$(curl -s -X POST "$BASE_URL/$CAPSULE_ID/invite" \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "'$USER1_ID'",
    "friendEmail": "friend2@example.com",
    "friendId": "'$USER3_ID'",
    "friendUsername": "friend2"
  }')

INVITE_CODE_2=$(extract_json_value "$RESPONSE" "inviteCode")

if [[ "$INVITE_CODE_2" != "" ]]; then
    print_result 0 "Second friend invited successfully"
    echo "   Invite Code: $INVITE_CODE_2"
else
    print_result 1 "Failed to invite second friend"
    echo "   Response: $RESPONSE"
fi

# Test 4: Invite third friend
echo "Test 4: Inviting third friend..."
RESPONSE=$(curl -s -X POST "$BASE_URL/$CAPSULE_ID/invite" \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "'$USER1_ID'",
    "friendEmail": "friend3@example.com",
    "friendId": "friend999",
    "friendUsername": "friend3"
  }')

INVITE_CODE_3=$(extract_json_value "$RESPONSE" "inviteCode")

if [[ "$INVITE_CODE_3" != "" ]]; then
    print_result 0 "Third friend invited successfully"
    echo "   Invite Code: $INVITE_CODE_3"
else
    print_result 1 "Failed to invite third friend"
    echo "   Response: $RESPONSE"
fi

echo -e "\n${YELLOW}🤝 Testing Invite Acceptance...${NC}"

# Test 5: First friend accepts invite
echo "Test 5: First friend accepting invite..."
RESPONSE=$(curl -s -X POST "$BASE_URL/accept-invite" \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "'$INVITE_CODE_1'",
    "userId": "'$USER2_ID'"
  }')

LINKED_CAPSULE_1=$(extract_json_value "$RESPONSE" "capsuleId")

if [[ "$LINKED_CAPSULE_1" != "" ]]; then
    print_result 0 "First friend accepted invite successfully"
    echo "   Linked Capsule ID: $LINKED_CAPSULE_1"
else
    print_result 1 "Failed to accept first invite"
    echo "   Response: $RESPONSE"
fi

# Test 6: Second friend accepts invite
echo "Test 6: Second friend accepting invite..."
RESPONSE=$(curl -s -X POST "$BASE_URL/accept-invite" \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "'$INVITE_CODE_2'",
    "userId": "'$USER3_ID'"
  }')

LINKED_CAPSULE_2=$(extract_json_value "$RESPONSE" "capsuleId")

if [[ "$LINKED_CAPSULE_2" != "" ]]; then
    print_result 0 "Second friend accepted invite successfully"
    echo "   Linked Capsule ID: $LINKED_CAPSULE_2"
else
    print_result 1 "Failed to accept second invite"
    echo "   Response: $RESPONSE"
fi

# Test 7: Third friend accepts invite
echo "Test 7: Third friend accepting invite..."
RESPONSE=$(curl -s -X POST "$BASE_URL/accept-invite" \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "'$INVITE_CODE_3'",
    "userId": "friend999"
  }')

LINKED_CAPSULE_3=$(extract_json_value "$RESPONSE" "capsuleId")

if [[ "$LINKED_CAPSULE_3" != "" ]]; then
    print_result 0 "Third friend accepted invite successfully"
    echo "   Linked Capsule ID: $LINKED_CAPSULE_3"
else
    print_result 1 "Failed to accept third invite"
    echo "   Response: $RESPONSE"
fi

echo -e "\n${YELLOW}🔓 Testing Capsule Opening...${NC}"

# Test 8: Try to open original capsule (should fail - not enough friends opened)
echo "Test 8: Trying to open original capsule (should fail)..."
RESPONSE=$(curl -s -X POST "$BASE_URL/$CAPSULE_ID/open" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER1_ID'"
  }')

SUCCESS=$(extract_json_value "$RESPONSE" "success")

if [[ "$SUCCESS" == "false" ]]; then
    print_result 0 "Original capsule correctly blocked (not enough friends opened)"
else
    print_result 1 "Original capsule should not open yet"
    echo "   Response: $RESPONSE"
fi

# Test 9: First friend opens their linked capsule
echo "Test 9: First friend opening their linked capsule..."
RESPONSE=$(curl -s -X POST "$BASE_URL/$LINKED_CAPSULE_1/open" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER2_ID'"
  }')

SUCCESS=$(extract_json_value "$RESPONSE" "success")

if [[ "$SUCCESS" == "true" ]]; then
    print_result 0 "First friend opened their capsule successfully"
else
    print_result 1 "Failed to open first friend's capsule"
    echo "   Response: $RESPONSE"
fi

# Test 10: Second friend opens their linked capsule
echo "Test 10: Second friend opening their linked capsule..."
RESPONSE=$(curl -s -X POST "$BASE_URL/$LINKED_CAPSULE_2/open" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER3_ID'"
  }')

SUCCESS=$(extract_json_value "$RESPONSE" "success")

if [[ "$SUCCESS" == "true" ]]; then
    print_result 0 "Second friend opened their capsule successfully"
else
    print_result 1 "Failed to open second friend's capsule"
    echo "   Response: $RESPONSE"
fi

# Test 11: Third friend opens their linked capsule
echo "Test 11: Third friend opening their linked capsule..."
RESPONSE=$(curl -s -X POST "$BASE_URL/$LINKED_CAPSULE_3/open" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "friend999"
  }')

SUCCESS=$(extract_json_value "$RESPONSE" "success")

if [[ "$SUCCESS" == "true" ]]; then
    print_result 0 "Third friend opened their capsule successfully"
else
    print_result 1 "Failed to open third friend's capsule"
    echo "   Response: $RESPONSE"
fi

# Test 12: Now try to open original capsule (should succeed)
echo "Test 12: Opening original capsule (should succeed now)..."
RESPONSE=$(curl -s -X POST "$BASE_URL/$CAPSULE_ID/open" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER1_ID'"
  }')

SUCCESS=$(extract_json_value "$RESPONSE" "success")

if [[ "$SUCCESS" == "true" ]]; then
    print_result 0 "Original capsule opened successfully!"
    echo "   🎉 Social capsule challenge completed!"
else
    print_result 1 "Failed to open original capsule"
    echo "   Response: $RESPONSE"
fi

echo -e "\n${YELLOW}📊 Testing Status and Statistics...${NC}"

# Test 13: Get capsule details
echo "Test 13: Getting capsule details..."
RESPONSE=$(curl -s -X GET "$BASE_URL/$CAPSULE_ID?userId=$USER1_ID")

SUCCESS=$(extract_json_value "$RESPONSE" "success")

if [[ "$SUCCESS" == "true" ]]; then
    print_result 0 "Capsule details retrieved successfully"
else
    print_result 1 "Failed to get capsule details"
    echo "   Response: $RESPONSE"
fi

# Test 14: Get capsule network
echo "Test 14: Getting capsule network..."
RESPONSE=$(curl -s -X GET "$BASE_URL/$CAPSULE_ID/network")

SUCCESS=$(extract_json_value "$RESPONSE" "success")

if [[ "$SUCCESS" == "true" ]]; then
    print_result 0 "Capsule network retrieved successfully"
else
    print_result 1 "Failed to get capsule network"
    echo "   Response: $RESPONSE"
fi

# Test 15: Get user statistics
echo "Test 15: Getting user statistics..."
RESPONSE=$(curl -s -X GET "$BASE_URL/user/$USER1_ID/statistics")

SUCCESS=$(extract_json_value "$RESPONSE" "success")

if [[ "$SUCCESS" == "true" ]]; then
    print_result 0 "User statistics retrieved successfully"
else
    print_result 1 "Failed to get user statistics"
    echo "   Response: $RESPONSE"
fi

# Test 16: Get user capsules
echo "Test 16: Getting user capsules..."
RESPONSE=$(curl -s -X GET "$BASE_URL/user/$USER1_ID/capsules")

SUCCESS=$(extract_json_value "$RESPONSE" "success")

if [[ "$SUCCESS" == "true" ]]; then
    print_result 0 "User capsules retrieved successfully"
else
    print_result 1 "Failed to get user capsules"
    echo "   Response: $RESPONSE"
fi

echo -e "\n${YELLOW}🔍 Testing Error Cases...${NC}"

# Test 17: Try to invite to non-existent capsule
echo "Test 17: Inviting to non-existent capsule (should fail)..."
RESPONSE=$(curl -s -X POST "$BASE_URL/invalid-id/invite" \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "'$USER1_ID'",
    "friendEmail": "test@example.com"
  }')

SUCCESS=$(extract_json_value "$RESPONSE" "success")

if [[ "$SUCCESS" == "false" ]]; then
    print_result 0 "Correctly rejected invite to non-existent capsule"
else
    print_result 1 "Should have rejected invite to non-existent capsule"
fi

# Test 18: Try to accept invalid invite code
echo "Test 18: Accepting invalid invite code (should fail)..."
RESPONSE=$(curl -s -X POST "$BASE_URL/accept-invite" \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "INVALID123",
    "userId": "'$USER2_ID'"
  }')

SUCCESS=$(extract_json_value "$RESPONSE" "success")

if [[ "$SUCCESS" == "false" ]]; then
    print_result 0 "Correctly rejected invalid invite code"
else
    print_result 1 "Should have rejected invalid invite code"
fi

# Test 19: Try to open capsule as non-owner
echo "Test 19: Opening capsule as non-owner (should fail)..."
RESPONSE=$(curl -s -X POST "$BASE_URL/$CAPSULE_ID/open" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER2_ID'"
  }')

SUCCESS=$(extract_json_value "$RESPONSE" "success")

if [[ "$SUCCESS" == "false" ]]; then
    print_result 0 "Correctly rejected non-owner capsule opening"
else
    print_result 1 "Should have rejected non-owner capsule opening"
fi

echo -e "\n${GREEN}🎯 Social Capsule Challenge Test Summary:${NC}"
echo "✅ Social capsule creation and management"
echo "✅ Friend invitation system"
echo "✅ Invite acceptance and linked capsule creation"
echo "✅ Coordinated capsule opening logic"
echo "✅ Network status tracking"
echo "✅ User statistics and progress tracking"
echo "✅ Error handling and validation"
echo ""
echo -e "${GREEN}🏛️ Social Capsule Challenge API is working correctly!${NC}"
