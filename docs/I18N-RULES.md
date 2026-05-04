# i18n Rules — Non-Negotiable

These rules apply to all UI development in Caloric. No exceptions.

## 1. No raw strings in components

```tsx
// ❌ Wrong
<Text>Start your plan</Text>

// ✅ Correct
<Text>{t("welcome.cta")}</Text>
```

If it's a new string: add it to `en` first, run the completeness script, let missing keys fail loudly.

## 2. Add keys FIRST, not after

When building a new component:

**Wrong flow:**
build UI → then think about translations

**Correct flow:**
define keys → add to `src/locales/en/` → build UI using `t()`

This forces discipline.

## 3. Use the completeness script as a gatekeeper

```bash
node scripts/i18n-missing-keys.js
```

Run it:

- Before commit
- Before PR
- Before release

If completeness drops → you broke something.

## 4. Design UI for worst-case languages

English is short. It lies to you.

Test with:

- **German** → long compound words
- **French** → verbose phrasing
- **Polish** → complex grammar

If your UI survives those → it survives everything.

## 5. Never assume 1-line text

```tsx
// ❌ Bad
numberOfLines={1}

// ✅ Good
// - Flexible containers
// - Allow wrapping
// - Test multiline states
```

## 6. Respect interpolation

```tsx
// ✅ Correct — grammar handled per locale
t("streak", { count })
// ❌ Wrong — kills grammar in other languages
`${count} ${t("day")}`;
```

## 7. New key checklist

Every time you add UI:

- [ ] Added to `src/locales/en/`
- [ ] No hardcoded strings
- [ ] Interpolation correct
- [ ] Checked German/French layout
- [ ] Ran completeness script

---

## Supported Locales

| Code  | Language               |
| ----- | ---------------------- |
| en-GB | English (UK) — default |
| en-US | English (US)           |
| de    | German                 |
| es    | Spanish                |
| fr    | French                 |
| nl    | Dutch                  |
| pl    | Polish                 |
| pt    | Portuguese             |
| pt-BR | Portuguese (Brazil)    |

---

## Enforcement Gates

i18n drift is **impossible**, not just unlikely. Two gates enforce this:

### Local Gate (Husky pre-push)

Runs before code leaves your machine:

```bash
npm run typecheck      # TypeScript
npm run i18n:validate  # Missing keys, interpolation parity
npm run test:i18n      # Language switching, stale translations
npm run test           # Full test suite
```

Skip with `git push --no-verify` only when you know what you're doing.

### CI Gate (GitHub Actions)

The real authority. Blocks merges if:

- Missing keys in any locale
- Interpolation token mismatches
- Generated types are stale
- i18n tests fail
- Hardcoded string count exceeds baseline

See `.github/workflows/ci.yml` → `i18n-gate` job.

### Hard Fail Rules

| Check                    | Fail? |
| ------------------------ | ----- |
| Missing translation keys | ✘     |
| Broken interpolation     | ✘     |
| Rich text tag mismatch   | ✘     |
| Hardcoded strings ↑      | ✘     |
| i18n tests failing       | ✘     |

### Soft Warning Rules

| Check                         | Action          |
| ----------------------------- | --------------- |
| Key identical to English      | Warn only       |
| Completeness slightly down    | Warn, not block |
| Long text risk (verbose copy) | Warn only       |

### Ratchet Policy

The hardcoded string baseline is tracked in `scripts/i18n-baseline.json`:

- Count must **never increase**
- Reductions should update the baseline
- User-facing violations are `0` — keep it that way

## Key Scripts

```bash
# Validate all locales (missing keys, interpolation, etc.)
npm run i18n:validate

# Auto-fix missing keys by copying from English
npm run i18n:fix

# Regenerate TypeScript types from locale files
npm run i18n:types

# Run just i18n tests
npm run test:i18n

# Full CI gate (validation + types + ratchet + tests)
npm run i18n:ci

# Audit for hardcoded strings
npm run i18n:audit
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full i18n infrastructure design.
