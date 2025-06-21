import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/jsx-runtime.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['mithril']
});