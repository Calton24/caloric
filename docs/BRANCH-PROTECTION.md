# Branch Protection Setup

**Required configuration for GitHub repository settings.**

This document specifies the branch protection rules that make security gates enforceable — not just documented.

---

## Required Branch Protection Rules

### Main Branch (`main`)

Go to: **Settings → Branches → Add branch protection rule**

| Setting                                   | Value      | Why                            |
| ----------------------------------------- | ---------- | ------------------------------ |
| **Branch name pattern**                   | `main`     | Protect production branch      |
| **Require a pull request before merging** | ✅ Enabled | No direct pushes               |
| **Require approvals**                     | 1          | At least one reviewer          |
| **Dismiss stale reviews**                 | ✅ Enabled | Re-review after changes        |
| **Require review from code owners**       | ✅ Enabled | Owner must approve             |
| **Require status checks to pass**         | ✅ Enabled | CI is law                      |
| **Require branches to be up to date**     | ✅ Enabled | No merge conflicts             |
| **Status checks that are required**       | See below  | Specific job names             |
| **Require conversation resolution**       | ✅ Enabled | Address all comments           |
| **Require signed commits**                | Optional   | For high-security environments |
| **Include administrators**                | ✅ Enabled | No one bypasses gates          |
| **Restrict who can push**                 | Optional   | Limit to maintainers           |

### Required Status Checks

These job names must be added to "Status checks that are required":

```
Security Gate
Lint & TypeScript Check
Unit Tests
All Checks Passed ✅
```

**Critical:** The "Security Gate" job runs `npm run mobile-core:verify:security` which includes:

- 21+ security checks
- npm audit for runtime vulnerabilities
- gitleaks secret scanning
- TypeScript compilation
- ESLint
- Full test suite

---

## Develop Branch (`develop`)

Same rules as `main`, but can relax "Include administrators" for faster iteration.

---

## Dependabot Auto-Merge Policy

| Update Type          | Auto-Merge?       | Rationale                 |
| -------------------- | ----------------- | ------------------------- |
| Patch updates        | ✅ Yes (after CI) | Low risk, security fixes  |
| Minor updates        | ❌ No             | May have breaking changes |
| Major updates        | ❌ No             | Requires migration review |
| Sensitive packages\* | ❌ Never          | Manual security review    |

_Sensitive packages: `@supabase/_`, `expo-secure-store`, `@stripe/_`, `@superwall/_`, `react-native-keychain`

### Dependency Freeze Windows

Before major releases:

1. Disable Dependabot auto-merge 1 week before launch
2. Only merge security-critical updates
3. Re-enable after launch stabilization

---

## CODEOWNERS File

Create `.github/CODEOWNERS`:

```
# Security-sensitive areas require security review
/src/features/auth/        @Calton24
/src/lib/billing/          @Calton24
/src/lib/supabase/         @Calton24
/src/infrastructure/security/ @Calton24
/scripts/security-audit.js @Calton24
/.github/workflows/        @Calton24

# Default owner for everything else
*                          @Calton24
```

---

## Verification Checklist

After configuring branch protection:

- [ ] Try pushing directly to `main` — should be rejected
- [ ] Create a PR with failing tests — should block merge
- [ ] Create a PR with TypeScript errors — should block merge
- [ ] Create a PR with security audit failures — should block merge
- [ ] Verify Dependabot PRs get proper labels
- [ ] Verify patch PRs auto-merge after CI passes
- [ ] Verify major PRs require manual approval

---

## Emergency Bypass

If you need to bypass protections for a critical hotfix:

1. **Never disable protections permanently**
2. Repository admin can temporarily disable "Include administrators"
3. Make the fix with a clear `[HOTFIX]` commit message
4. Re-enable protections immediately after
5. Create a follow-up PR to properly test the change

---

## Related Documentation

- [SECURITY-DONE-GATE.md](./SECURITY-DONE-GATE.md) — Security audit status
- [THREAT-MODEL.md](./THREAT-MODEL.md) — Threat categories and mitigations
- [README.md](./README.md#security-gates) — Security gates overview
