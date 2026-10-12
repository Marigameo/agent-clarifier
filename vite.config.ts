import { defineConfig } from 'vite';
import { shortTokens } from './scripts/short-tokens.ts';

// Library build: one ES module per entry. Type declarations come from
// `tsc -p tsconfig.build.json`, which runs after this (see "build" in package.json).
export default defineConfig({
  plugins: [shortTokens()],
  css: {
    // Features.LightDark from lightningcss. Without it, every `color-scheme` declaration gets
    // --lightningcss-light/dark toggles for a light-dark() we never write (round 22: −30 B gzipped).
    lightningcss: { exclude: 1048576 },
  },
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        'adapters/claude': 'src/adapters/claude.ts',
        'adapters/mcp': 'src/adapters/mcp.ts',
      },
      formats: ['es'],
    },
    target: 'es2022',
    // Vite leaves whitespace in ES library builds; minify fully so CDN users get a small file
    // and size-limit measures what actually ships.
    rolldownOptions: {
      output: {
        // The full object: a partial one silently turns whitespace removal off (+13 KB).
        // Property reads are side-effect free here, which lets the minifier fold more (round 22: −28 B).
        // So never write a bare `el.offsetWidth;` to force a reflow: it would be dropped. Use the value.
        minify: {
          compress: { treeshake: { propertyReadSideEffects: false } },
          mangle: true,
          codegen: { removeWhitespace: true },
        },
      },
    },
    sourcemap: true,
  },
});
