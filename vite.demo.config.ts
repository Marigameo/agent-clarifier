import { defineConfig } from 'vite';

// The playground as a static site, for GitHub Pages (round 24): `pnpm build:demo` → site/.
// The library build is vite.config.ts; this one only bundles the demo pages with src/.
const demo = new URL('./demo/', import.meta.url).pathname;

export default defineConfig({
  // package.json's `sideEffects` names only dist/index.js (what apps import), so the demo's
  // `import '../src/index'` would be tree-shaken away, and with it the element's define().
  plugins: [{ name: 'src-has-side-effects', transform: (code, id) => (id.includes('/src/') ? { code, moduleSideEffects: true } : null) }],
  root: demo,
  // Relative URLs, so the site works under /agent-clarifier/ (or any other path).
  base: './',
  build: {
    outDir: new URL('./site/', import.meta.url).pathname,
    emptyOutDir: true,
    rolldownOptions: {
      input: { index: `${demo}index.html`, break: `${demo}break.html` },
    },
  },
});
