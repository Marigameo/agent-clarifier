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
    // Vite leaves whitespace in ES library builds; minify fully so CDN users get a small file
    // and size-limit measures what actually ships.
    rolldownOptions: { output: { minify: true } },
    sourcemap: true,
  },
});
