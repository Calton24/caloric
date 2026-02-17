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
    },
  },
]);
