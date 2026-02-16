#!/usr/bin/env bash
# Integration smoke tests for skills

set -e

echo "Running smoke tests for wqq-wechat-skills..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: TypeScript type checking
echo -n "Testing TypeScript types... "
bunx tsc --noEmit > /dev/null 2>&1
echo -e "${GREEN}✓${NC}"

# Test 2: Unit tests
echo -n "Running unit tests... "
bun test skills/shared/**/*.test.ts > /dev/null 2>&1
echo -e "${GREEN}✓${NC}"

# Test 3: wqq-image-gen help
echo -n "Testing wqq-image-gen --help... "
output=$(bun skills/wqq-image-gen/scripts/main.ts --help 2>&1)
if echo "$output" | grep -q "Usage:"; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  exit 1
fi

# Test 4: wqq-wechat-article help
echo -n "Testing wqq-wechat-article --help... "
output=$(bun skills/wqq-wechat-article/scripts/main.ts --help 2>&1)
if echo "$output" | grep -q "Usage:"; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  exit 1
fi

# Test 5: wqq-image-gen error handling (missing args)
echo -n "Testing wqq-image-gen error handling... "
if bun skills/wqq-image-gen/scripts/main.ts > /dev/null 2>&1; then
  echo -e "${RED}✗ (should have failed)${NC}"
  exit 1
else
  echo -e "${GREEN}✓${NC}"
fi

# Test 6: wqq-wechat-article default workspace mode
echo -n "Testing wqq-wechat-article default workspace mode... "
if bun skills/wqq-wechat-article/scripts/main.ts > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  exit 1
fi

# Test 7: wqq-x-bookmarks export help
echo -n "Testing wqq-x-bookmarks export --help... "
output=$(bun skills/wqq-x-bookmarks/scripts/main.ts --help 2>&1)
if echo "$output" | grep -q "Usage:"; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  exit 1
fi

# Test 8: wqq-x-bookmarks debug help
echo -n "Testing wqq-x-bookmarks debug --help... "
output=$(bun skills/wqq-x-bookmarks/scripts/debug.ts --help 2>&1)
if echo "$output" | grep -q "Usage:"; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}All smoke tests passed!${NC}"
