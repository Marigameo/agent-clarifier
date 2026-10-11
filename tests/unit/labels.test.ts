import { describe, expect, it } from 'vitest';
import { DEFAULT_LABELS, format, mergeLabels, type PluralForms } from '../../src/labels';

describe('format: placeholders and numbers', () => {
  it('fills placeholders', () => {
    expect(format(DEFAULT_LABELS.answeredOf, { n: 2, total: 4 })).toBe('2 of 4 answered');
    // Words arrive isolated (FSI…PDI), so they keep their order in either direction (round 11).
    expect(format(DEFAULT_LABELS.skippedToast, { label: 'Budget' })).toBe('Skipped “\u2068Budget\u2069”');
  });

  it('isolates words but not numbers, which are written the local way', () => {
    expect(format('{n}: {label}', { n: 3, label: 'C++' }, 'ar-EG')).toBe('٣: \u2068C++\u2069');
  });

  it('a placeholder with no value is left visible, so a typo is noticed', () => {
    expect(format('Up to {max}', {})).toBe('Up to {max}');
  });

  // The full language tag decides the digits (Unicode CLDR data, which browsers follow):
  // Egyptian and Saudi Arabic use Arabic-Indic digits, plain "ar" and Moroccan Arabic use 0–9,
  // Persian uses its own. We follow the page's tag and never force a style.
  it('writes numbers the local way, as the page language says', () => {
    expect(format(DEFAULT_LABELS.stepOf, { n: 2, total: 4 }, 'ar-EG')).toBe('٢ of ٤');
    expect(format(DEFAULT_LABELS.stepOf, { n: 2, total: 4 }, 'ar')).toBe('2 of 4');
    expect(format('{n}', { n: 24 }, 'fa')).toBe('۲۴');
    expect(format('{n}', { n: 1234 }, 'de')).toBe('1.234');
    expect(format('{n}', { n: 1234 }, 'en')).toBe('1,234');
  });

  it('a translated label works the same way', () => {
    const ar = mergeLabels({ stepOf: '{n} من {total}' });
    expect(format(ar.stepOf, { n: 2, total: 4 }, 'ar-EG')).toBe('٢ من ٤');
  });

  it('a malformed language tag falls back to English instead of throwing', () => {
    expect(format(DEFAULT_LABELS.liveLimit, { max: 1 }, 'en_US')).toBe('Up to 1 choice.');
    expect(format('{n}', { n: 1234 }, '!!')).toBe('1,234');
  });
});

describe('format: plural forms', () => {
  it.each([
    [1, 'Up to 1 choice.'],
    [3, 'Up to 3 choices.'],
    [0, 'Up to 0 choices.'],
  ])('English, %i', (max, out) => {
    expect(format(DEFAULT_LABELS.liveLimit, { max }, 'en')).toBe(out);
  });

  // Arabic has all six forms; a good test that we don't assume "one/other".
  const AR: PluralForms = { zero: 'zero', one: 'one', two: 'two', few: 'few', many: 'many', other: 'other' };
  it.each([
    [0, 'zero'],
    [1, 'one'],
    [2, 'two'],
    [3, 'few'],
    [10, 'few'],
    [11, 'many'],
    [99, 'many'],
    [100, 'other'],
  ])('Arabic, %i → %s', (n, form) => {
    expect(format(AR, { n }, 'ar')).toBe(form);
  });

  // Polish: 2–4 are "few", but 12–14 are "many", and 22 is "few" again.
  const PL: PluralForms = { one: '{n} wybór', few: '{n} wybory', many: '{n} wyborów', other: '{n} wyboru' };
  it.each([
    [1, '1 wybór'],
    [2, '2 wybory'],
    [5, '5 wyborów'],
    [12, '12 wyborów'],
    [22, '22 wybory'],
  ])('Polish, %i → %s', (n, out) => {
    expect(format(PL, { n }, 'pl')).toBe(out);
  });

  it('the first number in vars picks the form', () => {
    expect(format(DEFAULT_LABELS.picksKept, { n: 1 })).toBe('1 pick kept');
    expect(format(DEFAULT_LABELS.picksKept, { n: 2 })).toBe('2 picks kept');
  });

  it('a missing form falls back to other', () => {
    expect(format({ one: 'one', other: 'other' }, { n: 2 }, 'ar')).toBe('other');
  });

  it('with no number given, other is used', () => {
    expect(format({ one: 'one', other: 'other' })).toBe('other');
  });
});

describe('mergeLabels', () => {
  it('returns every default when nothing is overridden', () => {
    expect(mergeLabels()).toEqual(DEFAULT_LABELS);
  });

  it('applies valid overrides, both plain and plural', () => {
    const l = mergeLabels({ skip: 'Not now', liveLimit: { one: 'Max {max}.', other: 'Max {max}.' } });
    expect(l.skip).toBe('Not now');
    expect(format(l.liveLimit, { max: 2 })).toBe('Max 2.');
  });

  it('ignores unknown keys and invalid values (labels may come from JSON)', () => {
    const l = mergeLabels({ skip: 42, upTo: { one: 'no other form' }, nope: 'x' } as never);
    expect(l.skip).toBe('Skip');
    expect(l.upTo).toBe('Up to {max}');
    expect('nope' in l).toBe(false);
  });

  it('does not change the defaults', () => {
    mergeLabels({ skip: 'Not now' });
    expect(DEFAULT_LABELS.skip).toBe('Skip');
  });
});
