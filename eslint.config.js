import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// Clean-architecture dependency rule (C85), enforced here and in tests/architecture.test.ts:
//   src/core  -> pure domain logic: no Phaser, no DOM/browser globals, no imports from game/ or data/
//   src/data  -> pure data: may import core types only
//   src/game  -> Phaser adapter layer: may import core + data
export default tseslint.config(
  { ignores: ['dist/**', 'dist-single/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['phaser', 'phaser/*'], message: 'src/core must stay engine-free (C85).' },
          { group: ['**/game/**', '**/data/**'], message: 'src/core may not depend on game/ or data/ (C85).' },
        ],
      }],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator', 'performance'],
    },
  },
  {
    files: ['src/data/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['phaser', 'phaser/*'], message: 'src/data is pure data (C85).' },
          { group: ['**/game/**'], message: 'src/data may only import core types (C85).' },
        ],
      }],
    },
  },
);
