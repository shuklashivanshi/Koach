import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'apps/mobile/**',
      '**/migrations/**',
      '.planning/**',
      '**/*.config.{js,mjs,cjs,ts}',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Model access goes through packages/ai only, so model IDs and cost logging live in one place.
    files: ['**/*.ts'],
    ignores: ['packages/ai/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: '@google/genai', message: 'Use @koach/ai instead.' }] },
      ],
    },
  },
  { files: ['eslint.config.mjs'], ...tseslint.configs.disableTypeChecked },
);
