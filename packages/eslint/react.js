import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import { config as baseConfig } from './base.js';

/**
 * ESLint configuration for React apps (Vite/CRA-style).
 * Lean by default: react-hooks + react-refresh, no strict eslint-plugin-react rules.
 * Use `react-library` if you want the full eslint-plugin-react recommended set.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  pluginReactHooks.configs['recommended-latest'] ??
    pluginReactHooks.configs.recommended,
  pluginReactRefresh.configs.vite,
  {
    rules: {
      'react-refresh/only-export-components': 'warn',
    },
  },
];
