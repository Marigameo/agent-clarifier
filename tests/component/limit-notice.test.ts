import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { Questionnaire } from '../../src/index';
import { leave } from '../../src/view/motion';
import { HOTEL, button, focused, mount, onStep, row } from './helpers';

// Round 17 (process/17-limit-notice): the pick limit is a quiet notice, not a black toast. The ink
// fill means "this acts" (DESIGN §1), so it stays only on toasts that carry Undo.

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
  it('drawn as ink text with no fill, nothing to press, on the card’s inline edge', async () => {
    const m = mount(MAX2);
    const n = await overLimit(m);
    expect(n.classList.contains('notice')).toBe(true);
    expect(n.getAttribute('part')).toBe('toast notice');
    expect(getComputedStyle(n).backgroundColor).toBe(CLEAR);
    expect(getComputedStyle(n).color).toBe(INK);
    expect(n.querySelector('button')).toBeNull();
    const edge = m.root.querySelector('.foot')!.getBoundingClientRect().left + 20;
    expect(Math.round(n.querySelector('.msg')!.getBoundingClientRect().left)).toBe(Math.round(edge));
  });

  it('toasts that carry Undo keep the ink fill', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.click(button(m, 'skip'));
    await onStep(m, 'Budget per night?');
    const t = m.root.querySelector<HTMLElement>('.toast')!;
    expect(t.classList.contains('notice')).toBe(false);
    expect(getComputedStyle(t).backgroundColor).toBe(INK);
  });

  it('it only fades, in and out: the 4px rise is for toasts with Undo', async () => {
    const m = mount(MAX2, { style: '--clarify-duration: 1600ms' });
    const n = await overLimit(m);
    const entering = n.getAnimations().filter((a): a is CSSTransition => a instanceof CSSTransition).map((a) => a.transitionProperty);
    expect(entering).not.toContain('transform');
    void leave(n);
    const frames = n.getAnimations().flatMap((a) => (a.effect as KeyframeEffect).getKeyframes());
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.some((f) => 'transform' in f)).toBe(false);
  });
});
