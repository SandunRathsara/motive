const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', '.expo/**', '.agents/**', '.claude/**'] },
  {
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': ['error', {
        selector: 'JSXAttribute[name.name="style"]',
        message: 'Use NativeWind classes and semantic tokens; see docs/ARCHITECTURE.md.',
      }],
    },
  },
  { files: ['lib/logger.ts'], rules: { 'no-console': 'off' } },
]);
