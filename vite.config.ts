import { defineConfig } from 'vite';

// Library build: one ES module per entry. Type declarations come from
// `tsc -p tsconfig.build.json`, which runs after this (see "build" in package.json).
export default defineConfig({
  build: {
    lib: {
      entry: { index: 'src/index.ts' },
      formats: ['es'],
    },
    target: 'es2022',
    sourcemap: true,
  },
});
