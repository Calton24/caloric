## Description

<!-- What does this PR do? Why is it needed? -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Refactor (no functional changes)
- [ ] Dependency update

## Security Checklist

> **Required for all PRs targeting `main` or `develop`.**

- [ ] **Security gate passes:** `npm run mobile-core:verify:security` exits 0
- [ ] No new `console.log/warn/error` added outside of `src/logging/logger.ts`
- [ ] No hardcoded secrets, API keys, or JWTs
- [ ] No new direct Supabase inserts without RLS documentation
- [ ] If adding a new dependency: verified it's not pre-release and has no critical CVEs

## React Hooks Checklist

- [ ] **If using `__DEV__` gates:** All hooks run BEFORE any early return
- [ ] No conditional hook calls (`if (x) useEffect(...)` is forbidden)
- [ ] Custom hooks follow the `use*` naming convention

## Testing

- [ ] Unit tests added/updated
- [ ] Tested on iOS simulator
- [ ] Tested on Android emulator
- [ ] E2E tests pass (if applicable)

## Screenshots / Videos

<!-- If UI changes, add screenshots or screen recordings -->

## Additional Notes

<!-- Any other context, trade-offs, or known issues -->

---

**CI Status:** This PR will not merge until the following checks pass:

- `lint-and-typecheck`
- `unit-tests`
- `security-gate`
