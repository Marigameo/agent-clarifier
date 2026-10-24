import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { Questionnaire } from '../../src/index';
import { leave } from '../../src/view/motion';
import { HOTEL, button, focused, mount, onStep, row } from './helpers';

// Round 17 (process/17-limit-notice): the pick limit is a quiet notice, not a black toast.
// Round 29 (process/29-one-note): every footer message is drawn that way, Undo or not. The fill is the
// primary button's alone, and a message only fades.

const MAX2: Questionnaire = {
  id: 'm2',
  questions: [{ id: 'm', prompt: 'What matters most?', type: 'multi', max: 2, options: [{ id: 'a', label: 'Walkable' }, { id: 'b', label: 'Quiet' }, { id: 'c', label: 'Gym' }] }],
};
const CLEAR = 'rgba(0, 0, 0, 0)';
const INK = 'rgb(28, 28, 28)'; // --clarify-fg, light

async function overLimit(m: ReturnType<typeof mount>) {
  for (const id of ['a', 'b', 'c']) await userEvent.click(row(m, id));
  await expect.poll(() => m.root.querySelector('.toast')).not.toBeNull();
  return m.root.querySelector<HTMLElement>('.toast')!;
}

describe('the pick limit is a notice, not a toast to act on', () => {
  it('drawn as ink text with no fill, nothing to press, where the dashes start', async () => {
    const m = mount(MAX2);
    const n = await overLimit(m);
    expect(n.classList.contains('notice')).toBe(true);
    expect(n.getAttribute('part')).toBe('toast notice');
    expect(getComputedStyle(n).backgroundColor).toBe(CLEAR);
    expect(getComputedStyle(n).color).toBe(INK);
    expect(n.querySelector('button')).toBeNull();
    // Where the dashes it replaces start: right after Back, which opens the footer since round 21.
    const back = m.root.querySelector('.foot [data-act="back"]')!.getBoundingClientRect();
    const gap = n.querySelector('.msg')!.getBoundingClientRect().left - back.right;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(16);
  });

  it('a toast with Undo is drawn the same way: ink text, no fill, Undo a link', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.click(button(m, 'skip'));
    await onStep(m, 'Budget per night?');
    const t = m.root.querySelector<HTMLElement>('.toast')!;
    expect(t.classList.contains('notice')).toBe(false);
    expect([getComputedStyle(t).backgroundColor, getComputedStyle(t).color]).toEqual([CLEAR, INK]);
    const undo = t.querySelector('[data-act="undo"]')!;
    expect([getComputedStyle(undo).color, getComputedStyle(undo).textDecorationLine]).toEqual([INK, 'underline']);
  });

  it.each(['notice', 'toast with Undo'])('a %s only fades, in and out', async (kind) => {
    const m = mount(kind === 'notice' ? MAX2 : HOTEL, { style: '--clarify-duration: 1600ms' });
    let n: HTMLElement;
    if (kind === 'notice') n = await overLimit(m);
    else {
      await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
      await userEvent.click(button(m, 'skip'));
      await expect.poll(() => m.root.querySelector('.toast')).not.toBeNull();
      n = m.root.querySelector<HTMLElement>('.toast')!;
    }
    const entering = n.getAnimations().filter((a): a is CSSTransition => a instanceof CSSTransition).map((a) => a.transitionProperty);
    expect(entering).not.toContain('transform');
    void leave(n);
    const frames = n.getAnimations().flatMap((a) => (a.effect as KeyframeEffect).getKeyframes());
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.some((f) => 'transform' in f)).toBe(false);
  });
});
