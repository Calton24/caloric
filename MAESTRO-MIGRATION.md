# Detox → Maestro Migration Guide

## Summary

Successfully migrated from Detox + GitHub Actions E2E testing to EAS Workflows + Maestro for iOS simulator testing.

**Reason for Migration:** GitHub Actions minutes exhausted (2,000/2,000). EAS Workflows provide dedicated mobile CI/CD infrastructure without consuming GitHub Actions budget.

## What Changed

### Removed (Detox)
- ✅ `.detoxrc.js` - Detox configuration
- ✅ `scripts/e2e-build-ios.js` - Custom xcodebuild wrapper
- ✅ `e2e/` directory - Detox test files
- ✅ Package dependencies: `detox`, `jest-circus`, `detox-expo-helpers` (611 packages removed)
- ✅ npm scripts: `e2e:build`, `e2e:test`, `e2e`
- ✅ GitHub Actions `e2e-tests-ios` job (eliminated macOS runner usage)

### Added (Maestro)
- ✅ `.eas/workflows/e2e-ios.yml` - EAS Workflow for E2E testing
- ✅ `maestro/flows/smoke-test.yaml` - Sample Maestro test flow
- ✅ `eas.json` - Added `preview` build profile for simulator builds
- ✅ npm script: `maestro:test` - Run Maestro tests locally

### Updated
- ✅ `package.json` - Removed Detox scripts/deps, added Maestro script
- ✅ `.github/workflows/ci.yml` - Removed E2E job, kept lint/unit tests only

## How It Works

### EAS Workflow Pipeline

1. **Trigger**: Push to main/develop/mvp-features or PR
2. **Build**: EAS builds iOS simulator .app using `preview` profile
3. **Test**: Maestro runs all flows in `maestro/flows/` against the build
4. **Results**: JUnit output format, artifacts uploaded on failure

### Workflow File: `.eas/workflows/e2e-ios.yml`

```yaml
jobs:
  build_and_test:
    steps:
      - type: build
        id: ios_simulator_build
        with:
          platform: ios
          profile: preview  # Simulator build
      
      - type: maestro
        id: maestro_test
        with:
          build_id: ${{ steps.ios_simulator_build.id }}
          flow_path: ./maestro/flows
          device_identifier: "iPhone 16 Plus"
          output_format: junit
```

## Local Testing

### Prerequisites

Install Maestro CLI:
```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

### Run Tests Locally

```bash
# Run all Maestro flows
npm run maestro:test

# Or use Maestro CLI directly
maestro test maestro/flows

# Run specific flow
maestro test maestro/flows/smoke-test.yaml

# Debug mode
maestro test --debug maestro/flows/smoke-test.yaml
```

### Local Simulator Build (Optional)

If you want to test with a local build:
```bash
# Build for simulator
npx expo run:ios --configuration Release

# Then run Maestro against it
maestro test maestro/flows
```

## Triggering Workflows

### Automatic Triggers

- **Push to branches**: `main`, `develop`, `mvp-features`
- **Pull requests** targeting: `main`, `develop`

### Manual Trigger

```bash
# Via EAS CLI
eas workflow:run e2e-ios

# Or trigger via git push
git push origin your-branch
```

### View Results

1. **EAS Dashboard**: https://expo.dev/accounts/[your-account]/projects/mobile-core/workflows
2. **Workflow runs** show:
   - Build status and logs
   - Maestro test results (pass/fail)
   - JUnit XML output
   - Screenshots/videos on failure
3. **GitHub PR checks** will show workflow status

## Writing Maestro Tests

### Example Flow Structure

```yaml
# maestro/flows/login-test.yaml
appId: com.calton24.mobilecore.dev
---
# Test login flow
- launchApp
- tapOn: "Sign In"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Submit"
- assertVisible: "Welcome"
```

### Common Commands

- `launchApp` - Start the app
- `tapOn: "text"` - Tap element by text
- `tapOn: { id: "button-id" }` - Tap by accessibility ID
- `assertVisible: "text"` - Assert element visible
- `inputText: "value"` - Type text
- `scrollUntilVisible: "text"` - Scroll to find element
- `swipe: { direction: "up" }` - Swipe gesture

### Best Practices

1. **Use accessibility IDs** on interactive elements
2. **Keep flows atomic** - one feature per flow
3. **Add timeouts** for async operations: `timeout: 10000`
4. **Use `optional: true`** for non-critical assertions
5. **Name flows descriptively**: `login-test.yaml`, not `test1.yaml`

## Environment Variables

Same Supabase env vars used in both local and EAS:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Configure in:
- **EAS**: Project settings → Secrets
- **Local**: `.env.local` (not committed)

## Cost Savings

**Before:**
- GitHub Actions: 2,000 minutes/month
- macOS runner: 10x multiplier
- E2E tests consumed ~200 real minutes = 2,000 GitHub minutes

**After:**
- GitHub Actions: Lint + unit tests only (~50 minutes/month)
- EAS Workflows: Dedicated mobile CI (no GitHub budget impact)
- **Savings**: ~1,950 GitHub Actions minutes/month freed up

## Troubleshooting

### Workflow doesn't trigger
- Check branch name matches trigger config
- Verify EAS project is linked: `eas whoami`
- Check workflow syntax: `eas workflow:list`

### Build fails
- Check build logs in EAS dashboard
- Verify `preview` profile in `eas.json`
- Ensure environment variables are set in EAS project

### Maestro tests fail
- Check test logs/screenshots in workflow artifacts
- Run locally with `maestro test --debug`
- Verify accessibility IDs match actual UI
- Check for timing issues (add `timeout` or `waitForAnimationToEnd`)

### Local Maestro not found
```bash
# Install/update Maestro
curl -fsSL "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version
```

## Next Steps

1. ✅ Migration complete
2. [ ] Add more Maestro flows for critical paths
3. [ ] Configure Maestro Cloud (optional, for parallelization)
4. [ ] Add accessibility IDs to key UI elements
5. [ ] Set up Slack/email notifications for workflow failures

## Resources

- [Maestro Docs](https://maestro.mobile.dev/docs)
- [EAS Workflows Docs](https://docs.expo.dev/eas/workflows/)
- [Maestro Best Practices](https://maestro.mobile.dev/docs/best-practices)
- [EAS Build Profiles](https://docs.expo.dev/build/eas-json/)
