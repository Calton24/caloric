// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const i18nPlugin = require('./scripts/eslint-plugin-i18n');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      // Supabase Edge Functions use Deno, not Node - ESLint can't resolve their imports
      'supabase/functions/**/*',
      // Scripts folder contains CommonJS node scripts
      'scripts/*',
    ],
  },
  {
    rules: {
      // Allow optional Firebase dependencies (they're dynamically imported with fallbacks)
      'import/no-unresolved': [
        'error',
        {
          ignore: [
            '@react-native-firebase/app',
            '@react-native-firebase/analytics',
            '@react-native-firebase/crashlytics',
            '@react-native-firebase/perf',
            'posthog-react-native',
          ],
        },
      ],
    },
  },

  // Allow require() in test files — necessary for Jest's dynamic mock patterns
  {
    files: ['__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // =========================================================================
  // ARCHITECTURE BOUNDARY: Vendor SDK Isolation
  // =========================================================================
  // Feature/UI/application code CANNOT import vendor SDKs directly.
  // Only these zones may touch third-party packages:
  //   - src/infrastructure/**  (provider implementations + abstractions)
  //   - src/lib/**             (thin SDK wrappers, e.g. Supabase client)
  //
  // Dependency direction:  UI → features → abstractions → vendors → nothing
  // This rule is the physical enforcement of that direction.
  // =========================================================================
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/infrastructure/**',
      'src/lib/**',
      // src/analytics/ removed — migrated to src/infrastructure/analytics/
      'src/examples/**',    // example/reference code, not production
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                // ── Storage ──
                '@react-native-async-storage/*',

                // ── Backend / Auth ──
                '@supabase/*',

                // ── Observability ──
                '@sentry/*',
                '@react-native-firebase/*',
                '@datadog/*',
                '@bugsnag/*',

                // ── Analytics ──
                'posthog-react-native',
                '@amplitude/*',
                '@segment/*',
                '@mixpanel/*',

                // ── Payments ──
                '@stripe/*',
                '@revenuecat/*',
                'react-native-purchases',
              ],
              message:
                'Vendor SDKs must only be imported inside src/infrastructure/** or src/lib/**. Use an abstraction instead.',
            },
          ],
        },
      ],
    },
  },

  // =========================================================================
  // i18n ENFORCEMENT: No hardcoded user-facing strings
  // =========================================================================
  // Catches raw English text in JSX. All visible strings must use t("key").
  // Runs as warn — the ratchet in i18n-ci.sh prevents new violations.
  // Baseline is tracked in scripts/i18n-baseline.json.
  // =========================================================================
  {
    files: ['app/**/*.{tsx,ts}', 'src/ui/**/*.{tsx,ts}'],
    plugins: { i18n: i18nPlugin },
    rules: {
      'i18n/no-hardcoded-strings': ['warn', {
        minLength: 2,
        ignorePatterns: [
          '^\\[',          // Log prefixes like [i18n]
          '^#',            // Color hex codes
          '^\\./',         // Relative paths
          '^https?://',    // URLs
          '^\\d',          // Strings starting with numbers
          '^[\\p{Emoji}\\s]+$', // Emoji-only strings
          '^[•·\\-–—\\s]+$',   // Password masks, bullet separators
        ],
      }],
    },
  },

]);
