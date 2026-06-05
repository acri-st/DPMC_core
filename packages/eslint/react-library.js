import pluginReact from 'eslint-plugin-react';
import { config as reactConfig } from './react.js';

/**
 * Stricter React configuration (adds eslint-plugin-react recommended rules).
 * Use for shared React libraries.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  ...reactConfig,
  pluginReact.configs.flat.recommended,
  {
    settings: { react: { version: 'detect' } },
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
];
