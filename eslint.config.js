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
]);
