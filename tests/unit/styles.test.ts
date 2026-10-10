import { describe, expect, it } from 'vitest';
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
