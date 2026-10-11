import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { Questionnaire } from '../../src/index';
import { HOTEL, button, live, mount, onStep, row } from './helpers';

// Round 12: the findings beyond round 11's cap (process/12-polish). Named after what the user sees.

const ONE: Questionnaire = {
  id: 'one',
  questions: [{ id: 'yes', label: 'Flights', prompt: 'Include flights?', type: 'single', options: [{ id: 'y', label: 'Yes' }, { id: 'n', label: 'No' }] }],
};

describe('status copy matches what is happening', () => {
  it('during the undo window the button keeps its label; once it closes, Undo goes and it says Sending… (#2)', async () => {
    const m = mount(ONE, { review: 'never', 'undo-window': '600' });
    m.el.addEventListener('clarify:submit', (e) => e.preventDefault()); // the app sends it, slowly
    await userEvent.click(row(m, 'y'));
    await expect.poll(() => m.el.state).toBe('submitting');
    const primary = () => m.root.querySelector<HTMLElement>('.foot .btn.primary')!;
    expect(primary().textContent).toBe('Send');
    expect(primary().getAttribute('aria-disabled')).toBe('true');
    expect(m.root.querySelector('[data-act="undo-send"]')).not.toBeNull();
    await expect.poll(() => primary().textContent, { timeout: 2000 }).toBe('Sending…');
    expect(m.root.querySelector('[data-act="undo-send"]')).toBeNull(); // no Undo once it can't undo
  });

  it('a failed send with no reason from the app still says the answers are kept (#3)', async () => {
    const m = mount(ONE, { review: 'never' });
    m.el.addEventListener('clarify:submit', (e) => e.preventDefault());
    await userEvent.click(row(m, 'y'));
    await expect.poll(() => m.el.state).toBe('submitting');
    m.el.setError('');
    await expect.poll(() => m.root.querySelector('.banner')?.textContent).toBe('Couldn’t send your answersYour answers are kept.');
    await expect.poll(() => live(m)).toBe('Couldn’t send your answers. They’re kept. Try again when you’re ready.');
  });
});

describe('screen readers hear what sighted users see', () => {
  it('an option that starts a sentence says so (#4)', async () => {
    const m = mount({ id: 'c', questions: [{ id: 'a', prompt: 'Access needs?', type: 'single', other: false, options: [{ id: 'none', label: 'None' }, { id: 'x', label: 'I’ll explain', compose: 'For accessibility, I need ' }] }] });
    expect(row(m, 'x').getAttribute('aria-description')).toBe('Finish this in the message box');
    expect(row(m, 'none').hasAttribute('aria-description')).toBe(false);
  });

  it('an unavailable Continue stays in the Tab order, and pressing it does nothing (#18)', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget per night?');
    await userEvent.click(row(m, 'mid'));
    await onStep(m, 'What matters most?');
    const next = button(m, 'next');
    expect(next.disabled).toBe(false);
    expect(next.getAttribute('aria-disabled')).toBe('true');
    next.click();
    await new Promise((r) => setTimeout(r, 150));
    expect(m.root.querySelector('.title')!.textContent).toContain('What matters most?');
  });
});

describe('language', () => {
  it('answers are joined the local way, never with a hand-built comma (#5)', async () => {
    const q: Questionnaire = { id: 'ar', flow: 'all', questions: [{ id: 'c', label: 'المطبخ', prompt: 'أي مطبخ؟', type: 'multi', options: [{ id: 'i', label: 'إيطالي' }, { id: 'j', label: 'ياباني' }, { id: 'h', label: 'هندي' }] }] };
    const m = mount(q, { lang: 'ar', dir: 'rtl' });
    expect(m.root.querySelector('.q-num')!.textContent).toBe(new Intl.NumberFormat('ar').format(1));
    for (const id of ['i', 'j', 'h']) await userEvent.click(row(m, id));
    await userEvent.click(button(m, 'send'));
    await expect.poll(() => m.el.state).toBe('answered');
    const dd = m.root.querySelector('.record dd')!.textContent;
    expect(dd).toBe(new Intl.ListFormat('ar', { type: 'unit' }).format(['إيطالي', 'ياباني', 'هندي']));
    expect(dd).not.toContain(', ');
  });
});

describe('type follows the reader, within limits (#7)', () => {
  afterEach(() => document.documentElement.style.removeProperty('font-size'));
  const size = (m: ReturnType<typeof mount>) => parseFloat(getComputedStyle(row(m, 'covent').querySelector('.label')!).fontSize);

  it('a larger browser font makes the card larger', async () => {
    document.documentElement.style.fontSize = '20px';
    expect(size(mount(HOTEL))).toBe(17.5);
  });

  it('an app that shrinks the root (62.5%) never shrinks the card below its design size', async () => {
    document.documentElement.style.fontSize = '62.5%';
    expect(size(mount(HOTEL))).toBe(14);
  });
});

describe('craft details', () => {
  it('counters use tabular digits, there is no tap flash, no faked italics, compact keeps 16px titles', async () => {
    const m = mount(HOTEL, { density: 'compact' });
    expect(getComputedStyle(m.root.querySelector('.foot-l')!).fontVariantNumeric).toBe('tabular-nums');
    expect(getComputedStyle(row(m, 'covent')).getPropertyValue('-webkit-tap-highlight-color')).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(m.root.querySelector('.title')!).fontSize).toBe('16px');
  });

  it('the Undo icon mirrors in right-to-left, like every other directional icon (#15)', async () => {
    const m = mount(HOTEL, { dir: 'rtl' });
    await userEvent.click(button(m, 'skip'));
    await onStep(m, 'Budget per night?');
    expect(m.root.querySelector('.toast .i')!.classList.contains('flip')).toBe(true);
  });
});
