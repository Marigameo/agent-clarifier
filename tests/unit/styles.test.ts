/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { KEEP, TOKEN, shortenTokens } from '../../scripts/short-tokens.ts';
import raw from '../../src/styles.css?raw';

// BUILD §8.1: logical properties only, so right-to-left languages get a mirrored layout for free.
// A physical property (margin-left, right: 0, text-align: left…) would stay put in RTL.
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

const PHYSICAL = [
  /\b(?:margin|padding|border|inset|scroll-margin|scroll-padding)-(?:left|right)\b/,
  /(?:^|[\s;{])(?:left|right)\s*:/,
  /\b(?:text-align|float|clear)\s*:\s*(?:left|right)\b/,
  /\bborder-(?:top|bottom)-(?:left|right)-radius\b/,
];

describe('styles.css', () => {
  // Without this, the checks below pass on an empty string (they did from M2 to round 22).
  it('is really loaded', () => expect(css).toContain(':host {'));

  it.each(PHYSICAL.map((re) => [re.source, re]))('has no physical property matching %s', (_, re) => {
    const hit = css.split('\n').find((line) => (re as RegExp).test(line));
    expect(hit, `use a logical property instead: ${hit?.trim()}`).toBeUndefined();
  });

  it('the scan really catches a physical property', () => {
    expect(PHYSICAL.some((re) => re.test('.x { margin-left: 4px }'))).toBe(true);
    expect(PHYSICAL.some((re) => re.test('.x { right: 0 }'))).toBe(true);
    expect(PHYSICAL.some((re) => re.test('.x { margin-inline-start: 4px }'))).toBe(false);
  });
});

// Round 22: the build shortens private --_* tokens (scripts/short-tokens.ts). Safe only if it's a pure
// rename and nothing outside the CSS refers to a renamed token.
describe('short private tokens', () => {
  const ts = import.meta.glob<string>('../../src/**/*.ts', { query: '?raw', import: 'default', eager: true });
  const names = (s: string) => new Set(Array.from(s.matchAll(TOKEN), (m) => m[1]!));

  it('every private token the TypeScript reads or writes keeps its name', () => {
    expect(Object.keys(ts).length).toBeGreaterThan(10);
    for (const [file, code] of Object.entries(ts)) {
      for (const n of names(code)) expect(KEEP.has(n), `${file} uses --_${n}: add it to KEEP`).toBe(true);
    }
  });

  it('is a pure rename: one short name per token, kept and public names untouched', () => {
    const out = shortenTokens(raw);
    const before = Array.from(raw.matchAll(TOKEN), (m) => m[1]!);
    const after = Array.from(out.matchAll(TOKEN), (m) => m[1]!);
    expect(after.length).toBe(before.length);
    const pairs = new Map<string, string>();
    before.forEach((n, i) => pairs.set(n, after[i]!));
    expect(new Set(pairs.values()).size).toBe(pairs.size); // no two tokens share a name
    for (const k of KEEP) if (pairs.has(k)) expect(pairs.get(k)).toBe(k);
    expect(out.match(/--clarify-[\w-]+/g)).toEqual(raw.match(/--clarify-[\w-]+/g));
    expect(out.replace(TOKEN, '')).toBe(raw.replace(TOKEN, '')); // nothing else changed
  });
});
