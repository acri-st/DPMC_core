// @ts-check
import { config } from '@dpmc/eslint/nest';

export default [
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
  ...config,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
