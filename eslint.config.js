// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      // Supabase Edge Functions use Deno, not Node - ESLint can't resolve their imports
      'supabase/functions/**/*',
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
          ],
        },
      ],
      // === ARCHITECTURE BOUNDARY ENFORCEMENT ===
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Import from src/lib/supabase instead. Only src/lib/supabase/client.ts may import the Supabase SDK directly.',
            },
            {
              name: '@react-native-async-storage/async-storage',
              message: 'Import from src/infrastructure/storage instead. Only the AsyncStorage provider may import this directly.',
            },
            {
              name: '@sentry/react-native',
              message: 'Import from src/infrastructure/errorReporting instead. Only the Sentry provider may import this directly.',
            },
            {
              name: 'posthog-react-native',
              message: 'Import from src/infrastructure/analytics instead. Only the PostHog provider may import this directly.',
            },
          ],
        },
      ],
    },
  },
  // Allow vendor imports ONLY in infrastructure/provider files
  {
    files: ['src/lib/supabase/client.ts', 'src/lib/supabase/index.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['src/infrastructure/storage/providers/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['src/infrastructure/errorReporting/SentryErrorReporter.ts', 'src/infrastructure/errorReporting/providers/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['src/infrastructure/analytics/providers/*.ts', 'src/analytics/posthog.client.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

]);
