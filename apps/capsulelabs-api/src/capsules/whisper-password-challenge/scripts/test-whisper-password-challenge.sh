#!/bin/bash

# Whisper Password Challenge Test Script
echo "🤫 Testing Whisper Password Challenge API..."

BASE_URL="http://localhost:3000"
API_BASE="$BASE_URL/whisper-password-challenge"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local expected_status="$2"
    local response
    local status_code
    
    echo -e "${BLUE}Testing: $test_name${NC}"
    
    response=$(eval "$3" 2>/dev/null)
    status_code=$?
    
    if [ $status_code -eq 0 ]; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        echo "Response: $response"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        echo "Response: $response"
