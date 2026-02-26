#!/bin/bash
# Branch Protection Setup Script
# Configures GitHub branch protection rules using GitHub CLI
#
# Prerequisites:
#   - GitHub CLI installed: brew install gh
#   - Authenticated: gh auth login
#
# Usage:
#   ./scripts/setup-branch-protection.sh
#
# This script sets up branch protection for 'main' with:
#   - Required PR reviews from code owners
#   - Required status checks (Security Gate, Lint, Tests)
#   - No force pushes or deletions
#   - Administrators included in restrictions

set -euo pipefail

# Repository (auto-detected or set manually)
REPO="${GITHUB_REPOSITORY:-Calton24/mobile-core}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up branch protection for ${REPO}...${NC}"

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo "Install it with: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI.${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Required status checks (must match CI job names exactly)
# These come from .github/workflows/ci.yml
REQUIRED_CHECKS=(
    "Security Gate"
    "Lint & TypeScript Check"
    "Unit Tests"
    "All Checks Passed ✅"
)

echo -e "\n${GREEN}Configuring branch protection for 'main'...${NC}"

# Build the status checks JSON array
CHECKS_JSON=""
for check in "${REQUIRED_CHECKS[@]}"; do
    if [ -n "$CHECKS_JSON" ]; then
        CHECKS_JSON+=","
    fi
    CHECKS_JSON+="\"$check\""
done

# Apply branch protection using GitHub API via gh
gh api \
    --method PUT \
    "/repos/${REPO}/branches/main/protection" \
    -H "Accept: application/vnd.github+json" \
    -f required_status_checks='{"strict":true,"contexts":['$CHECKS_JSON']}' \
    -F enforce_admins=true \
    -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":1}' \
    -f restrictions=null \
    -F allow_force_pushes=false \
    -F allow_deletions=false \
    -F required_linear_history=false \
    -F required_conversation_resolution=true

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Branch protection configured successfully!${NC}"
    echo -e "\nProtection rules applied to 'main':"
    echo "  • Require pull request before merging"
    echo "  • Require 1 approval"
    echo "  • Require review from code owners"
    echo "  • Dismiss stale reviews on new commits"
    echo "  • Require status checks to pass:"
    for check in "${REQUIRED_CHECKS[@]}"; do
        echo "    - $check"
    done
    echo "  • Require branches to be up to date"
    echo "  • Require conversation resolution"
    echo "  • Block force pushes"
    echo "  • Block branch deletion"
    echo "  • Include administrators (no bypass)"
else
    echo -e "\n${RED}❌ Failed to configure branch protection.${NC}"
    echo "You may need to configure it manually in GitHub Settings."
    exit 1
fi

echo -e "\n${YELLOW}Verifying configuration...${NC}"
gh api "/repos/${REPO}/branches/main/protection" --jq '.required_status_checks.contexts[]' 2>/dev/null || echo "Could not verify (this is normal for new repos)"

echo -e "\n${GREEN}Done! Branch protection is now enforced.${NC}"
echo -e "Test it by trying to push directly to main — it should be rejected."
