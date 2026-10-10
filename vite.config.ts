import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: { index: 'src/index.ts' },
      formats: ['es'],
    },
    target: 'es2022',
    sourcemap: true,
  },
  plugins: [dts({ include: ['src'], exclude: ['tests'] })],
});
