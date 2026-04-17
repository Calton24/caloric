#!/usr/bin/env bash
#
# i18n CI gate — run in CI/PR to enforce translation quality.
#
# Checks:
#   1. Locale validation (missing keys, extra keys, interpolation parity, empty/stale values)
#   2. Generated types are up-to-date (no stale types.generated.ts)
#   3. Hardcoded string ratchet — violation count must not exceed baseline
#   4. Language switching tests pass
#
# Usage:
#   npm run i18n:ci
#   # or directly:
#   bash scripts/i18n-ci.sh
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

step() {
  echo ""
  echo -e "${YELLOW}▸ $1${NC}"
}

pass() {
  echo -e "  ${GREEN}✔ $1${NC}"
}

fail() {
  echo -e "  ${RED}✘ $1${NC}"
  ERRORS=$((ERRORS + 1))
}

# ---------- 1. Locale validation ----------

step "Validating locale files…"

if node scripts/validate-locales.js; then
  pass "All locale files valid"
else
  fail "Locale validation failed — run 'npm run i18n:fix' to auto-add missing keys"
fi

# ---------- 2. Generated types freshness ----------

step "Checking generated types are up-to-date…"

TYPES_FILE="src/infrastructure/i18n/types.generated.ts"

# Stash current generated file
cp "$TYPES_FILE" "$TYPES_FILE.bak"

# Regenerate
node scripts/generate-i18n-types.js > /dev/null 2>&1

if diff -q "$TYPES_FILE" "$TYPES_FILE.bak" > /dev/null 2>&1; then
  pass "types.generated.ts is up-to-date"
else
  fail "types.generated.ts is stale — run 'npm run i18n:types' and commit"
fi

# Restore original (in case it was stale, don't modify working tree in CI)
mv "$TYPES_FILE.bak" "$TYPES_FILE"

# ---------- 3. Hardcoded string ratchet ----------

step "Checking hardcoded string ratchet…"

BASELINE_FILE="scripts/i18n-baseline.json"
if [ ! -f "$BASELINE_FILE" ]; then
  fail "Baseline file missing: $BASELINE_FILE"
else
  BASELINE=$(node -e "console.log(require('./$BASELINE_FILE').count)")

  # Count current violations
  CURRENT=$(npx eslint 'app/**/*.{tsx,ts}' 'src/ui/**/*.{tsx,ts}' 2>&1 | grep -c "i18n/no-hardcoded-strings" || echo "0")

  if [ "$CURRENT" -gt "$BASELINE" ]; then
    fail "Hardcoded string count increased: $CURRENT (was $BASELINE). Fix new violations before merging."
  elif [ "$CURRENT" -lt "$BASELINE" ]; then
    pass "Hardcoded strings reduced: $CURRENT (was $BASELINE) — update baseline!"
    echo -e "  ${YELLOW}→ Update scripts/i18n-baseline.json count to $CURRENT${NC}"
  else
    pass "Hardcoded strings: $CURRENT (baseline: $BASELINE)"
  fi
fi

# ---------- 4. Language switching tests ----------

step "Running i18n tests…"

if npx jest __tests__/i18n-switching.test.ts --no-coverage --silent 2>/dev/null; then
  pass "All i18n tests pass"
else
  fail "i18n tests failed"
fi

# ---------- Summary ----------

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}═══════════════════════════════════════${NC}"
  echo -e "${GREEN}  i18n CI gate: ALL CHECKS PASSED ✔   ${NC}"
  echo -e "${GREEN}═══════════════════════════════════════${NC}"
  exit 0
else
  echo -e "${RED}═══════════════════════════════════════${NC}"
  echo -e "${RED}  i18n CI gate: $ERRORS CHECK(S) FAILED ✘  ${NC}"
  echo -e "${RED}═══════════════════════════════════════${NC}"
  exit 1
fi
