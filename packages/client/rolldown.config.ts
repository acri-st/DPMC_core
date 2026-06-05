import { defineConfig } from 'rolldown';
import { dts } from 'rolldown-plugin-dts';

const external = [
  /^@ts-rest\//,
  'class-validator',
  'date-fns',
  'zod',
];

export default defineConfig([
  {
    input: 'src/index.ts',
    platform: 'neutral',
    treeshake: true,
    external,
    plugins: [dts()],
    output: {
      dir: 'dist',
      format: 'esm',
      entryFileNames: '[name].mjs',
      sourcemap: true,
    },
  },
  {
    input: 'src/index.ts',
    platform: 'neutral',
    treeshake: true,
    external,
    output: {
      dir: 'dist',
      format: 'cjs',
      entryFileNames: '[name].cjs',
      sourcemap: true,
      exports: 'named',
    },
  },
]);
