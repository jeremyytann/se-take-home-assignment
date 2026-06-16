#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps
set -euo pipefail

echo "Running unit tests..."

npx tsc --project tsconfig.test.json
node --test .tmp/test/src/domain/*.test.js

echo "Unit tests completed"
