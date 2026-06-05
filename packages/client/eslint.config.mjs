// @ts-check
import { config } from '@dpmc/eslint/node';

export default [
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
  ...config,
  {
    languageOptions: {
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
