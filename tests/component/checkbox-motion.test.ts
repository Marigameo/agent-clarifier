import { afterEach, describe, expect, it } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';
import type { Questionnaire } from '../../src/index';
import { focused, mount, row } from './helpers';

// Round 15 (process/15-checkbox-motion): the multi checkbox, built with Emil Kowalski's animate
// skill. Pointer only; the tick is revealed, never animated back out; reduced motion fades.

const MULTI: Questionnaire = {
  id: 'multi',
  questions: [{ id: 'm', prompt: 'Which cuisines?', type: 'multi', options: [{ id: 'it', label: 'Italian' }, { id: 'jp', label: 'Japanese' }] }],
};
const SLOW = { style: '--clarify-duration: 1600ms' }; // tick = 0.75 × 1600 = 1200ms: easy to catch running
const tick = (m: ReturnType<typeof mount>, id: string) => row(m, id).querySelector('.key .i')!;
const running = (el: Element) =>
  el.getAnimations().filter((a): a is CSSTransition => a instanceof CSSTransition).map((a) => `${a.transitionProperty} ${Math.round(Number(a.effect!.getTiming().duration))}`);
const media = (value: string) => cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value }] });

afterEach(() => media(''));

describe('checkbox motion', () => {
  it('a click reveals the tick (clip-path, 0.75× the duration)', async () => {
    const m = mount(MULTI, SLOW);
    await userEvent.click(row(m, 'jp'));
    expect(running(tick(m, 'jp'))).toEqual(['clip-path 1200']);
  });

  it('a keyboard toggle never animates (Space)', async () => {
    const m = mount(MULTI, SLOW);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('it');
    await userEvent.keyboard(' ');
    expect(row(m, 'it').getAttribute('aria-checked')).toBe('true');
    expect(running(tick(m, 'it'))).toEqual([]);
  });

  it('unticking is instant', async () => {
    const m = mount(MULTI, SLOW);
    await userEvent.click(row(m, 'jp'));
    await new Promise((r) => setTimeout(r, 1300));
    await userEvent.click(row(m, 'jp'));
    expect(row(m, 'jp').getAttribute('aria-checked')).toBe('false');
    expect(running(tick(m, 'jp'))).toEqual([]);
  });

  it('the box gives a little under a held press (.95), and comes back on release', async () => {
    const m = mount(MULTI);
    const key = row(m, 'jp').querySelector<HTMLElement>('.key')!;
    const r = row(m, 'jp').getBoundingClientRect();
    const at = { x: r.left + r.width / 2, y: r.top + r.height / 2, button: 'left' as const, clickCount: 1 };
    await cdp().send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at });
    await cdp().send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at });
    await expect.poll(() => getComputedStyle(key).transform).toBe('matrix(0.95, 0, 0, 0.95, 0, 0)');
    await cdp().send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at });
    await expect.poll(() => getComputedStyle(key).transform).toBe('none');
  });

  it('with reduced motion: no press, and the tick fades instead of wiping', async () => {
    await media('reduce');
    const m = mount(MULTI, SLOW);
    expect(getComputedStyle(row(m, 'jp').querySelector('.key')!).transitionProperty).not.toContain('transform');
    await userEvent.click(row(m, 'jp'));
    expect(running(tick(m, 'jp'))).toEqual(['opacity 1200']);
    expect(getComputedStyle(tick(m, 'jp')).clipPath).toBe('none');
  });
});
