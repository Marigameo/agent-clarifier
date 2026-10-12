// Build-only: shortens the private --_* tokens in the shipped CSS (--_accent-soft → --_c), so the source
// keeps readable names and the bundle doesn't pay for them (round 22: −119 B gzipped). Public --clarify-*
// names are never touched.
import type { Plugin } from 'vite';

/** Private tokens the TypeScript reads or writes, so they keep their names. A unit test scans src/ for more. */
export const KEEP: ReadonlySet<string> = new Set(['vvh', 'duration', 'ease']);

export const TOKEN = /--_([\w-]+)/g;
const SHORT = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Renames every private token not in `keep` to a one-letter name, in order of first use. */
export function shortenTokens(css: string, keep: ReadonlySet<string> = KEEP): string {
  const names = [...new Set(Array.from(css.matchAll(TOKEN), (m) => m[1]!))].filter((n) => !keep.has(n));
  const free = [...SHORT].filter((c) => !keep.has(c));
  if (names.length > free.length) throw new Error(`short-tokens: ${names.length} tokens, only ${free.length} short names`);
  const map = new Map(names.map((n, i) => [n, free[i]!]));
  return css.replace(TOKEN, (whole, n: string) => (map.has(n) ? `--_${map.get(n)}` : whole));
}

export function shortTokens(): Plugin {
  return {
    name: 'short-private-tokens',
    apply: 'build',
    enforce: 'pre', // before Vite's CSS plugin turns the file into a JS string
    transform(code, id) {
      if (id.endsWith('/styles.css?inline')) return { code: shortenTokens(code), map: null };
    },
  };
}
