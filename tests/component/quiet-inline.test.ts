import { afterEach, describe, expect, it } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';
import type { Questionnaire } from '../../src/index';
import { HOTEL, focused, mount, row } from './helpers';

// Round 14 (process/14-quiet-and-inline): quiet chrome, "Something else" typed in place, a 16px
// checkbox. One test per change, named after what the user would see go wrong.

const MULTI: Questionnaire = {
  id: 'multi',
  questions: [{ id: 'm', prompt: 'Which cuisines?', type: 'multi', options: [{ id: 'it', label: 'Italian' }, { id: 'jp', label: 'Japanese' }] }],
};
const ACCENT = 'rgb(28, 28, 28)'; // ink (#1c1c1c): the accent defaults to it since round 28
const color = (el: Element, prop = 'color') => getComputedStyle(el).getPropertyValue(prop);
const field = (m: ReturnType<typeof mount>) => m.root.querySelector<HTMLElement>('.other-field')!;

describe('the user’s pick is the loudest thing on the card', () => {
  it('the Recommended badge and the source dot are grey, not the accent', async () => {
    const m = mount({ ...HOTEL, source: 'Trip planner' });
    const badge = row(m, 'southbank').querySelector('.badge')!;
    expect(color(badge)).not.toBe(ACCENT);
    expect(getComputedStyle(m.root.querySelector('.source')!, '::before').backgroundColor).not.toBe(ACCENT);
    await userEvent.click(row(m, 'covent'));
    expect(color(row(m, 'covent').querySelector('.key')!, 'background-color')).toBe(ACCENT); // the pick still is
  });
});

describe('"Something else" turns into the field in place', () => {
  it('the field sits inside the row, so typing adds no second box below it', async () => {
    const m = mount(HOTEL);
    const other = row(m, '__other');
    const before = m.root.querySelector('.list')!.getBoundingClientRect().height;
    await userEvent.click(other);
    expect(focused(m)?.tagName).toBe('TEXTAREA');
    const r = other.getBoundingClientRect();
    const f = field(m).getBoundingClientRect();
    expect(f.top).toBeGreaterThanOrEqual(r.top);
    expect(f.bottom).toBeLessThanOrEqual(r.bottom);
    // Within half a pixel: a second box would add ~40px, and layout can land a hair off mid-click.
    expect(m.root.querySelector('.list')!.getBoundingClientRect().height).toBeCloseTo(before, 0);
    // And it's painted on top of the row, not hidden under it (round 16).
    const t = field(m).querySelector('textarea')!.getBoundingClientRect();
    expect(m.root.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2)?.tagName).toBe('TEXTAREA');
  });

  it('the input’s placeholder is the row’s own label, and the label stays the radio’s name', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, '__other'));
    expect(field(m).querySelector('textarea')!.placeholder).toBe('Something else');
    expect(row(m, '__other').textContent).toContain('Something else');
  });

  it('a text field never sits inside the radio (screen readers: nested-interactive)', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, '__other'));
    expect(row(m, '__other').querySelector('[data-input]')).toBeNull();
  });

  it('single: once there’s text, the other options step back, readable and still clickable', async () => {
    const m = mount(HOTEL);
    const label = row(m, 'covent').querySelector('.label')!;
    const ink = color(label);
    await userEvent.click(row(m, '__other'));
    expect(color(label)).toBe(ink); // focused but empty: nothing has changed yet
    await userEvent.keyboard('Zone 2');
    expect(color(label)).not.toBe(ink);
    expect(getComputedStyle(row(m, 'covent')).opacity).toBe('1'); // faded ≠ disabled
    await userEvent.keyboard('{Backspace>6/}');
    expect(color(label)).toBe(ink);
  });

  it('multi: typed text is added to the ticks, so the ticks don’t fade', async () => {
    const m = mount(MULTI);
    await userEvent.click(row(m, 'it'));
    const ink = color(row(m, 'jp').querySelector('.label')!);
    await userEvent.click(row(m, '__other'));
    await userEvent.keyboard('Korean');
    expect(color(row(m, 'jp').querySelector('.label')!)).toBe(ink);
    expect(row(m, '__other').querySelector('.key.box')).not.toBeNull(); // a checkbox like its neighbours
  });
});

describe('details', () => {
  it('the checkbox is 16px, centred in the 26px key slot so labels keep one edge', async () => {
    const m = mount(MULTI);
    const box = row(m, 'it').querySelector('.key')!.getBoundingClientRect();
    expect([box.width, box.height]).toEqual([16, 16]);
    const multiLabel = row(m, 'it').querySelector('.label')!.getBoundingClientRect().left;
    const single = mount(HOTEL);
    expect(multiLabel).toBe(row(single, 'covent').querySelector('.label')!.getBoundingClientRect().left);
  });

  it('a keyboard-focused row hides the dividers on both its edges (no stubs at its corners)', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    const below = row(m, 'ken');
    expect(getComputedStyle(row(m, 'southbank'), '::before').borderTopColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(below, '::before').borderTopColor).toBe('rgba(0, 0, 0, 0)');
    await userEvent.keyboard('{ArrowDown}');
    expect(getComputedStyle(row(m, 'southbank'), '::before').borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});

// Round 14 follow-up: the wrapped "Something else" row escaped the divider and ring rules.
describe('"Something else" follows the same divider and ring rules as every row', () => {
  const MULTI_D: Questionnaire = {
    id: 'md',
    questions: [{ id: 'm', prompt: 'What matters?', type: 'multi', delegate: true, options: [{ id: 'a', label: 'Walkable' }, { id: 'b', label: 'Quiet' }] }],
  };
  const NONE = 'rgba(0, 0, 0, 0)';
  const line = (el: Element) => getComputedStyle(el, '::before').borderTopColor;

  it('unticked with the mouse, it shows no ring (rings are for the keyboard)', async () => {
    const m = mount(MULTI_D);
    const key = row(m, '__other').querySelector('.key')!;
    await userEvent.click(key);
    expect(focused(m)?.tagName).toBe('TEXTAREA');
    expect(getComputedStyle(row(m, '__other')).boxShadow).not.toBe('none'); // typing: the field shows focus
    await userEvent.click(key);
    expect(row(m, '__other').getAttribute('aria-checked')).toBe('false');
    expect(getComputedStyle(row(m, '__other')).boxShadow).toBe('none');
  });

  it('hovering it, or the row above it, hides the dividers at its edges', async () => {
    const m = mount(MULTI_D);
    await userEvent.hover(row(m, '__other'));
    expect(line(row(m, '__other'))).toBe(NONE);
    expect(line(row(m, '__delegate'))).toBe(NONE);
    await userEvent.hover(row(m, 'b'));
    expect(line(row(m, '__other'))).toBe(NONE);
  });

  it('keyboard focus on it hides the dividers at its edges', async () => {
    const m = mount(MULTI_D);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('a');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(focused(m)?.dataset.opt).toBe('__other');
    expect(line(row(m, '__other'))).toBe(NONE);
    expect(line(row(m, '__delegate'))).toBe(NONE);
  });
});

// Round 16 (process/16-skill-recheck): the re-check of the skill audits found two round-14 side effects.
describe('"Something else" never cuts its label or answer, and keeps an edge in contrast themes', () => {
  const LABEL = 'Something else: a neighbourhood, a landmark or a postcode you would like to be near';
  const LONG_Q: Questionnaire = { id: 'l', questions: [{ id: 'a', prompt: 'Which area?', type: 'single', other: { label: LABEL }, options: [{ id: 'cg', label: 'Covent Garden' }, { id: 'sb', label: 'South Bank' }] }] };
  const area = (m: ReturnType<typeof mount>) => field(m).querySelector('textarea')!;
  const lines = (el: HTMLElement) => Math.round(el.clientHeight / parseFloat(getComputedStyle(el).lineHeight));
  const media = (name: string, value: string) => cdp().send('Emulation.setEmulatedMedia', { features: [{ name, value }] });
  afterEach(() => media('forced-colors', ''));

  it('a long custom label wraps in full as the placeholder, inside the row (F2)', async () => {
    const m = mount(LONG_Q, { style: 'inline-size: 360px' });
    await userEvent.click(row(m, '__other'));
    expect(area(m).placeholder).toBe(LABEL);
    expect(lines(area(m))).toBeGreaterThan(1);
    expect(area(m).scrollHeight).toBeLessThanOrEqual(area(m).clientHeight); // nothing hidden
    expect(area(m).getBoundingClientRect().bottom).toBeLessThanOrEqual(row(m, '__other').getBoundingClientRect().bottom);
  });

  it('a short answer under a long label shrinks the row back to one line', async () => {
    const m = mount(LONG_Q, { style: 'inline-size: 360px' });
    await userEvent.click(row(m, '__other'));
    await userEvent.keyboard('Soho');
    expect(lines(area(m))).toBe(1);
    expect(row(m, '__other').getBoundingClientRect().height).toBeLessThan(60);
  });

  it('a long typed answer wraps and grows the row instead of scrolling out of sight', async () => {
    const m = mount(HOTEL, { style: 'inline-size: 320px' });
    await userEvent.click(row(m, '__other'));
    await userEvent.keyboard(`https://maps.example.com/${'x'.repeat(90)}`); // no break opportunities
    expect(lines(area(m))).toBeGreaterThan(1);
    expect(area(m).scrollHeight).toBeLessThanOrEqual(area(m).clientHeight);
    expect(area(m).getBoundingClientRect().right).toBeLessThanOrEqual(m.root.querySelector('.card')!.getBoundingClientRect().right);
  });

  it('Enter never adds a line to "Something else"', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, '__other'));
    await userEvent.keyboard('{Enter}');
    expect(area(m).value).toBe('');
  });

  it('in a contrast theme an open field keeps an edge, Highlight while focused (F1)', async () => {
    await media('forced-colors', 'active');
    const m = mount(HOTEL);
    await userEvent.click(row(m, '__other'));
    await userEvent.keyboard('Soho');
    expect(getComputedStyle(row(m, '__other')).outlineWidth).toBe('2px'); // focused
    (m.root.querySelector('[data-act="skip"]') as HTMLElement).focus();
    const o = getComputedStyle(row(m, '__other'));
    expect([o.outlineStyle, o.outlineWidth]).toEqual(['solid', '1px']); // not focused: still an edge
  });
});
