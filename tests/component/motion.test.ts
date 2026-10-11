import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { HOTEL, button, focused, mount, onStep, row } from './helpers';

// Motion answers "what just happened?" (DESIGN §7). These pin the round 9 audit's changes.
const moves = (a: Animation) =>
  (a.effect as KeyframeEffect).getKeyframes().some((f) => 'transform' in f || 'blockSize' in f);

describe('motion', () => {
  it('folding into the pill takes 1.25× the base duration (200ms)', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.click(button(m, 'minimise'));
    const pill = m.root.querySelector<HTMLElement>('.pill')!;
    const durations = pill.getAnimations().map((a) => a.effect!.getTiming().duration);
    expect(durations.length).toBeGreaterThan(0);
    expect(durations.every((d) => d === 200)).toBe(true);
    // A capsule changing height would show as an oval, so the pill only fades.
    expect(pill.getAnimations().some(moves)).toBe(false);
  });

  it('with reduced motion, views still crossfade but nothing moves or resizes', async () => {
    const real = window.matchMedia;
    window.matchMedia = (q: string) => (q.includes('reduced-motion') ? ({ matches: true } as MediaQueryList) : real.call(window, q));
    try {
      const m = mount(HOTEL);
      await userEvent.click(row(m, 'covent'));
      await onStep(m, 'Budget per night?');
      const card = m.root.querySelector<HTMLElement>('.card')!;
      const running = [...card.getAnimations(), ...card.querySelector<HTMLElement>('.scroll')!.getAnimations()];
      expect(running).toHaveLength(1);
      expect(running.some(moves)).toBe(false);
    } finally {
      window.matchMedia = real;
    }
  });

  it('a toast fades in, fades out before it goes, and a fade never takes a newer toast with it', { timeout: 15000 }, async () => {
    // Slow every fade down so the window between "fading" and "gone" is easy to act in.
    const m = mount(HOTEL, { style: '--clarify-duration: 1500ms' });
    const toast = () => m.root.querySelector<HTMLElement>('.toast');
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.click(button(m, 'skip'));
    await onStep(m, 'Budget per night?');
    expect(toast()!.getAnimations().some((a) => a instanceof CSSTransition && a.transitionProperty === 'opacity')).toBe(true);

    // After 5s it starts to leave, and is still there while it fades.
    await expect.poll(() => toast()?.getAnimations().some((a) => !(a instanceof CSSTransition)), { timeout: 6000 }).toBe(true);
    // It leaves a quarter faster than it came (round 10).
    const exit = toast()!.getAnimations().find((a) => !(a instanceof CSSTransition))!;
    expect(exit.effect!.getTiming().duration).toBe(1125);

    // Undo and skip again while it fades: the new toast must outlive the old fade.
    // (Keyboard, because a pointer won't click things that are still moving.)
    await userEvent.keyboard('{Control>}z{/Control}');
    await onStep(m, 'Which area?');
    button(m, 'skip').focus();
    await userEvent.keyboard('{Enter}');
    await onStep(m, 'Budget per night?');
    await new Promise((r) => setTimeout(r, 1800));
    expect(toast()).not.toBeNull();
  });

  it('a toast waits while the tab is hidden, so Undo is still there when you come back', { timeout: 15000 }, async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.click(button(m, 'skip'));
    await onStep(m, 'Budget per night?');
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    try {
      await new Promise((r) => setTimeout(r, 6000));
      expect(m.root.querySelector('.toast')).not.toBeNull();
    } finally {
      delete (document as { hidden?: boolean }).hidden;
    }
    await expect.poll(() => m.root.querySelector('.toast'), { timeout: 3000 }).toBeNull();
  });

  it('the loading shimmer slides on transform (off the main thread), not background-position', async () => {
    const m = mount(HOTEL);
    m.el.reset();
    m.el.open({ ...HOTEL, questions: HOTEL.questions.slice(0, 1) }, { partial: true });
    const sk = m.root.querySelector<HTMLElement>('.sk')!;
    const shimmer = sk.getAnimations({ subtree: true }).find((a) => (a as CSSAnimation).animationName === 'shimmer')!;
    const frames = (shimmer.effect as KeyframeEffect).getKeyframes();
    expect(frames.some((f) => 'transform' in f)).toBe(true);
    expect(frames.some((f) => 'backgroundPosition' in f)).toBe(false);
    // It sweeps in the reading direction.
    expect(getComputedStyle(sk, '::after').animationDirection).toBe('normal');
    m.el.setAttribute('dir', 'rtl');
    expect(getComputedStyle(sk, '::after').animationDirection).toBe('reverse');
  });
});

describe('hover', () => {
  it('buttons and chips answer a mouse hover with the hover fill', async () => {
    const m = mount(HOTEL, { theme: 'light' });
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    const skip = button(m, 'skip');
    const before = getComputedStyle(skip).backgroundColor;
    await userEvent.hover(skip);
    await expect.poll(() => getComputedStyle(skip).backgroundColor).toBe('rgb(245, 245, 245)');
    expect(before).not.toBe('rgb(245, 245, 245)');
  });

  it('a busy Send (aria-disabled since round 11) stops answering hover', async () => {
    const m = mount({ id: 'one', questions: [HOTEL.questions[0]!] }, { theme: 'light', review: 'always' });
    m.el.addEventListener('clarify:submit', (e) => e.preventDefault());
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Check your answers');
    const send = button(m, 'send');
    const rest = getComputedStyle(send).backgroundColor;
    await userEvent.hover(send); // the pointer rests on Send…
    expect(getComputedStyle(send).backgroundColor).not.toBe(rest);
    send.focus();
    await userEvent.keyboard('{Enter}'); // …while it's sent
    await expect.poll(() => send.getAttribute('aria-disabled')).toBe('true');
    expect(send.matches(':hover')).toBe(true);
    expect(getComputedStyle(send).backgroundColor).toBe(rest);
  });
});
