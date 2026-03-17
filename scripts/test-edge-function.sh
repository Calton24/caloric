#!/bin/bash
# Test the analyze-meal Edge Function components locally
# Usage: ./scripts/test-edge-function.sh <OPENAI_API_KEY>
#
# Tests:
#   1. OpenAI API key validity
#   2. OpenAI vision model access
#   3. Full structured output with a tiny test image

set -euo pipefail

KEY="${1:-}"
if [ -z "$KEY" ]; then
  echo "❌ Usage: ./scripts/test-edge-function.sh <OPENAI_API_KEY>"
  exit 1
fi

echo "━━━ Test 1: API Key Validity ━━━"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.openai.com/v1/models \
  -H "Authorization: Bearer $KEY")

if [ "$STATUS" = "200" ]; then
  echo "✅ API key is valid (HTTP $STATUS)"
else
  echo "❌ API key rejected (HTTP $STATUS). Generate a new key at https://platform.openai.com/api-keys"
  exit 1
fi

echo ""
echo "━━━ Test 2: gpt-4o-mini Access ━━━"
HAS_MODEL=$(curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer $KEY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
models = [m['id'] for m in data.get('data', [])]
if 'gpt-4o-mini' in models:
    print('yes')
else:
    print('no')
    print('Available vision models:', [m for m in models if '4o' in m or 'vision' in m])
")

if [ "$HAS_MODEL" = "yes" ]; then
  echo "✅ gpt-4o-mini is accessible"
else
  echo "❌ gpt-4o-mini not accessible"
  echo "$HAS_MODEL"
  exit 1
fi

echo ""
echo "━━━ Test 3: Vision API Call (tiny test image) ━━━"
# 1x1 red pixel JPEG as base64
TEST_IMAGE="/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k="

RESPONSE=$(curl -s -w "\n%{http_code}" https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KEY" \
  -d "{
    \"model\": \"gpt-4o-mini\",
    \"messages\": [
      {\"role\": \"system\", \"content\": \"You are a test. Reply with exactly: {\\\"status\\\": \\\"ok\\\"}\"},
      {\"role\": \"user\", \"content\": [
        {\"type\": \"text\", \"text\": \"Test image. Reply with {status: ok}\"},
        {\"type\": \"image_url\", \"image_url\": {\"url\": \"data:image/jpeg;base64,$TEST_IMAGE\", \"detail\": \"low\"}}
      ]}
    ],
    \"max_tokens\": 20
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Vision API call succeeded (HTTP $HTTP_CODE)"
  CONTENT=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['choices'][0]['message']['content'])" 2>/dev/null || echo "$BODY")
  echo "   Response: $CONTENT"
else
  echo "❌ Vision API call failed (HTTP $HTTP_CODE)"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  exit 1
fi

echo ""
echo "━━━ All tests passed! ━━━"
echo "Set this key as a Supabase secret:"
echo "  supabase secrets set OPENAI_API_KEY=<your-key>"
echo "(Do NOT paste the key in chat — run the command directly in your terminal)"
