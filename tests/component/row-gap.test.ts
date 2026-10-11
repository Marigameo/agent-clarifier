import { afterEach, describe, expect, it } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';
import type { Questionnaire } from '../../src/index';
import { button, mount, onStep, row } from './helpers';

// Round 19 (process/19-row-gap): filled neighbours never pinch into one shape. Each fill is drawn
// 2px inside its row, so two filled rows show a 4px gap; heights don't change.

const MULTI: Questionnaire = {
  id: 'm',
  questions: [{ id: 'q', prompt: 'What matters most?', type: 'multi', options: [{ id: 'a', label: 'Walkable' }, { id: 'b', label: 'Quiet' }, { id: 'c', label: 'Gym', description: 'Open early, with a pool' }] }],
};
const THREE: Questionnaire = {
  id: 't',
  questions: [
    { id: 'x', label: 'Area', prompt: 'Which area?', type: 'single', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
    { id: 'y', label: 'Budget', prompt: 'Budget?', type: 'single', options: [{ id: 'l', label: 'Low' }, { id: 'h', label: 'High' }] },
    { id: 'z', label: 'Notes', prompt: 'Anything else?', type: 'text' },
  ],
};
const media = (value: string) => cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value }] });
afterEach(() => media(''));

/** The fill's box: the row's border box minus its block borders (the background is clipped to it). */
function fill(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  expect(s.backgroundClip).toBe('padding-box');
  return { top: r.top + parseFloat(s.borderTopWidth), bottom: r.bottom - parseFloat(s.borderBottomWidth), height: r.height };
}

describe('space between filled rows', () => {
  it('two picks side by side show a 4px gap, and rows keep their 52px height', async () => {
    const m = mount(MULTI);
    await userEvent.click(row(m, 'a'));
    await userEvent.click(row(m, 'b'));
    const [a, b] = [fill(row(m, 'a')), fill(row(m, 'b'))];
    expect(b.top - a.bottom).toBe(4);
    expect(a.height).toBe(52);
  });

  it('a taller row (with a description) keeps its height too: border + padding still total 20px', async () => {
    const m = mount(MULTI);
    const c = row(m, 'c');
    expect(Math.round(c.getBoundingClientRect().height - c.querySelector('.body')!.getBoundingClientRect().height)).toBe(20);
  });

  it('skipped rows on review show the same gap', async () => {
    const m = mount(THREE, { review: 'always' });
    await userEvent.click(row(m, 'a')); // one answer, or skipping everything ends without a review
    await onStep(m, 'Budget?');
    await userEvent.click(button(m, 'skip'));
    await onStep(m, 'Anything else?');
    await userEvent.click(button(m, 'skip'));
    await onStep(m, 'Check your answers');
    const [x, y] = [...m.root.querySelectorAll<HTMLElement>('.review .row.flag')];
    expect(fill(y!).top - fill(x!).bottom).toBe(4);
  });

  it('dividers sit on the row boundary, the middle of the gap', async () => {
    const m = mount(MULTI);
    expect(getComputedStyle(row(m, 'b'), '::before').top).toBe('-2px');
  });

  it('in a contrast theme the inset goes (transparent borders are painted there), padding comes back', async () => {
    await media('active');
    const m = mount(MULTI);
    const s = getComputedStyle(row(m, 'a'));
    expect([s.borderTopWidth, s.paddingTop]).toEqual(['0px', '10px']);
    expect(row(m, 'a').getBoundingClientRect().height).toBe(52);
  });
});
