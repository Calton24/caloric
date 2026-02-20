# Quick Commands Reference

## Local CI Enforcement (Pre-Push)

**GitHub Actions is disabled.** Run these locally before pushing:

```bash
# Quick check (~20s)
npm run validate

# Full confidence (~30s)
npm run validate && SIMULATOR_UDID=$UDID npm run maestro:ci:ios:fast
```

Expected output:

- `npm run validate`: All tests pass, typecheck passes, lint passes
- `maestro:ci:ios:fast`: `CI_RESULT=PASS` in log file

## Setup (One-time per terminal session)

```bash
export UDID=$(xcrun simctl list devices available | grep -m 1 -E "iPhone 15 Pro" | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/')
echo "UDID: $UDID"
```

## Daily Development

### Fast Mode (~11s)

```bash
SIMULATOR_UDID=$UDID npm run maestro:ci:ios:fast
```

### Full Mode (~4min first time, ~30s incremental)

```bash
SIMULATOR_UDID=$UDID npm run maestro:ci:ios:full
```

## Check Results

### Latest result

```bash
tail ci-logs/$(ls -t ci-logs/ | head -1) | grep CI_RESULT
```

### View full log

```bash
cat ci-logs/$(ls -t ci-logs/ | head -1)
```

### List recent runs

```bash
ls -lt ci-logs/ | head -5
```

## Determinism Test

```bash
# RUN #1
SIMULATOR_UDID=$UDID npm run maestro:ci:ios:fast

# RUN #2
SIMULATOR_UDID=$UDID npm run maestro:ci:ios:fast
```

## Manual Steps

### Build only

```bash
SIMULATOR_UDID=$UDID npm run ios:sim:build
```

### Install only

```bash
SIMULATOR_UDID=$UDID npm run ios:sim:install
```

### Run Maestro only

```bash
maestro test maestro/flows
```

### Start Metro

```bash
npm run start:dev-client
```

### Debug build failure

```bash
# View last build log
cat ci-logs/$(ls -t ci-logs/ | head -1)

# Check xcodebuild errors
SIMULATOR_UDID=$UDID npm run ios:sim:build 2>&1 | grep -i error

# Clean build
cd ios && rm -rf build && cd ..
```

### Clean iOS build artifacts

```bash
cd ios
rm -rf build
rm -rf Pods
rm -rf ~/Library/Developer/Xcode/DerivedData/MobileCoreDev-*
bundle exec pod install --deployment --clean-install
cd ..
```

## Troubleshooting

### Kill Metro

```bash
lsof -ti tcp:8081 | xargs kill -9
```

### List available simulators

```bash
xcrun simctl list devices available
```

### Boot simulator manually

```bash
xcrun simctl boot "$UDID"
```

### Check Metro status

```bash
curl http://127.0.0.1:8081/status
```

## Development

### Run tests

```bash
npm test
```

### Type check

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

### Full validation (pre-commit)

```bash
npm run validate
```

## Git Workflow

### Check status and recent commits

```bash
git status
git log --oneline -5
```

### Commit and push

```bash
git add -A
git commit -m "your message"
git push
```

## iOS Simulator Management

### List all simulators

```bash
xcrun simctl list devices
```

### Find iPhone 15 Pro UDID

```bash
xcrun simctl list devices available | grep "iPhone 15 Pro"
```

### Shutdown all simulators

```bash
xcrun simctl shutdown all
```

### Erase simulator (reset to factory)

```bash
xcrun simctl erase "$UDID"
```

### Uninstall app from simulator

```bash
xcrun simctl uninstall "$UDID" com.calton24.mobilecore.dev
```

## GitHub Actions Management

**Status:** ✅ Disabled (billing exhausted) - Verified 2026-02-20

### Re-enable GitHub Actions

When you have billing or want cloud CI again:

```bash
# Move workflow back to workflows directory
git mv .github/workflows-disabled/ci.yml .github/workflows/ci.yml
git commit -m "chore(ci): re-enable GitHub Actions"
git push
```

Workflow will start running automatically on next push.

**Important:** Renaming to `.disabled.yml` doesn't work - GitHub runs ALL `.yml` files in `.github/workflows/` regardless of name.

### Why Disabled?

- GitHub Actions minutes: 2,000/2,000 used
- macOS runners are 10x multiplier
- Local Maestro CI is deterministic and fast
- Solo dev doesn't need cloud enforcement yet

### What Was Running?

- Lint & TypeScript check (ubuntu)
- Unit tests (ubuntu)
- Unused exports check (ubuntu)
- Build validation (ubuntu)

**All covered by:** `npm run validate` (runs locally in ~20s)

### Reenable Git Actions Work Flow

- git mv .github/workflows-disabled/ci.yml .github/workflows/ci.yml
- git commit -m "chore(ci): re-enable GitHub Actions"
- git push
