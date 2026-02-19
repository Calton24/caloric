# Maestro CI Protocol

## Quick Start

### Daily Development (Fast Mode)

Skip xcodebuild, just install + test (~11s):

```bash
UDID=$(xcrun simctl list devices available | grep -m 1 -E "iPhone 15 Pro" | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/')
SIMULATOR_UDID=$UDID npm run maestro:ci:ios:fast
```

### Pre-Merge / End of Day (Full Mode)

Build + install + test (~4min first time, ~30s incremental):

```bash
UDID=$(xcrun simctl list devices available | grep -m 1 -E "iPhone 15 Pro" | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/')
SIMULATOR_UDID=$UDID npm run maestro:ci:ios:full
```

## Proof Artifacts

Every run creates a timestamped log in `ci-logs/`:

```bash
# Check latest result
tail ci-logs/$(ls -t ci-logs/ | head -1) | grep CI_RESULT
```

Look for:

- `CI_RESULT=PASS` ✅
- `CI_RESULT=FAIL` ❌

## What the Script Does

1. **Boot simulator** (idempotent - won't fail if already booted)
2. **Kill port 8081** (surgical - no `killall -9 node` chaos)
3. **Start Metro** with `--dev-client`
4. **Wait for Metro** (HTTP polling until `packager-status:running`)
5. **Build iOS** (only in FULL mode, skipped in FAST mode)
6. **Install .app** to simulator
7. **Run Maestro** flows in `maestro/flows/`
8. **Write CI_RESULT** to log file
9. **Kill Metro** (only the Metro we started)

## Available Scripts

| Script                | Mode           | Time          | Use Case                               |
| --------------------- | -------------- | ------------- | -------------------------------------- |
| `maestro:ci:ios:fast` | SKIP_BUILD=1   | ~11s          | Tight feedback loop during development |
| `maestro:ci:ios:full` | SKIP_BUILD=0   | ~4min (first) | Pre-merge confidence, CI gates         |
| `maestro:ci:ios`      | Default (full) | ~4min (first) | Alias for full mode                    |

## Logs Structure

```
ci-logs/
  maestro-ci-ios-2026-02-19T18-28-07-137Z.log  # RUN_ID = ISO timestamp
  maestro-ci-ios-2026-02-19T18-26-55-140Z.log
  ...
```

Each log contains:

- Run ID, mode (FAST/FULL), simulator UDID
- All console output from Metro, xcodebuild, Maestro
- Final verdict: `CI_RESULT=PASS` or `CI_RESULT=FAIL`

## Determinism Check

Run fast mode twice to prove no state leakage:

```bash
UDID=$(xcrun simctl list devices available | grep -m 1 -E "iPhone 15 Pro" | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/')
SIMULATOR_UDID=$UDID npm run maestro:ci:ios:fast  # RUN #1
SIMULATOR_UDID=$UDID npm run maestro:ci:ios:fast  # RUN #2 (must also pass)
```

Both should show `CI_RESULT=PASS` in their respective log files.

## Self-Hosted Runner Setup (Future)

When ready to set up a self-hosted GitHub Actions runner:

1. **Create runner user** on your Mac
2. **Install prerequisites**: Xcode, Node 20, Maestro CLI
3. **Register runner** from GitHub repo settings
4. **Add to workflow**:
   ```yaml
   e2e-ios:
     runs-on: [self-hosted, macOS, ios-e2e, maestro]
     steps:
       - run: npm run maestro:ci:ios:full
   ```

## Troubleshooting

### Metro not starting

- Check port 8081: `lsof -ti tcp:8081`
- Script auto-kills it, but manual cleanup: `lsof -ti tcp:8081 | xargs kill -9`

### Build failed

- Check `ci-logs/maestro-ci-ios-<timestamp>.log` for xcodebuild errors
- Run manually: `SIMULATOR_UDID=<uuid> npm run ios:sim:build`

### Maestro test failed

- Check `.maestro/tests/<timestamp>/` for Maestro debug artifacts
- Run Maestro manually: `maestro test maestro/flows/smoke-test.yaml --debug`
- Verify testIDs exist in app (see `MAESTRO-TESTID-GUIDE.md`)

### App won't launch / red box

- Check Metro connectivity: `curl http://127.0.0.1:8081/status`
- Verify simulator booted: `xcrun simctl list devices | grep Booted`
- Check log for "Metro ready" confirmation

## CI Strategy

| Environment      | Runner          | Scripts                     | Cost          |
| ---------------- | --------------- | --------------------------- | ------------- |
| **PR checks**    | GitHub Ubuntu   | lint, typecheck, unit tests | ~50 min/month |
| **E2E tests**    | Self-hosted Mac | maestro:ci:ios:full         | £0            |
| **Store builds** | EAS Workflows   | eas build                   | Pay per build |

**Why this works:**

- GitHub Actions: Cheap Linux runners for fast checks
- Self-hosted: Zero GitHub minutes for expensive iOS E2E
- EAS: Only when you need production artifacts

**No more:**

- ❌ Wasting 1,950 GitHub minutes/month on macOS runners
- ❌ Waiting 4 minutes for xcodebuild on every iteration
- ❌ Guessing if tests passed from terminal scrollback
- ❌ Killing all Node processes with `killall -9`
