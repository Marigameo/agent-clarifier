// Motion answers "what just happened?" (DESIGN §1, §7). Never decoration.
// - The card's height animates between views, so the page doesn't jump.
// - A new step slides 12px in the reading direction (back slides the other way), with a fade.
// - Folding into the pill or the record (and back out) moves the most area, so it takes 1.25× as long.
// - With reduced motion nothing moves or resizes, but views still crossfade: a fade isn't motion,
//   and an instant swap is the jarring change motion is here to prevent (round 9).

export type Move = 'forward' | 'back' | 'swap' | 'fold' | 'open';

export const reduced = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

function token(el: Element, name: string, fallback: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

function timing(el: Element): { duration: number; easing: string } {
  return { duration: parseFloat(token(el, '--_duration', '160')) || 160, easing: token(el, '--_ease', 'ease-out') };
}

/**
 * Animate a freshly swapped-in view.
 * @param from the old view's height (0 when nothing was shown)
 */
export function enter(el: HTMLElement, from: number, move: Move, rtl: boolean): void {
  if (typeof el.animate !== 'function') return;
  const base = timing(el);
  const t = { ...base, duration: move === 'fold' ? base.duration * 1.25 : base.duration };
  const body = move === 'open' ? el : (el.querySelector('.scroll') ?? el);

  if (reduced()) {
    body.animate([{ opacity: 0 }, { opacity: 1 }], t);
    return;
  }
  if (move === 'open') {
    el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], t);
    return;
  }
  const to = el.getBoundingClientRect().height;
  // A capsule can't change height without turning into an oval, so the pill only fades in.
  if (from && to && Math.abs(from - to) > 1 && !el.classList.contains('pill')) {
    el.animate([{ blockSize: `${from}px`, overflow: 'hidden' }, { blockSize: `${to}px`, overflow: 'hidden' }], t);
  }
  if (move === 'forward' || move === 'back') {
    const x = 12 * (move === 'back' ? -1 : 1) * (rtl ? -1 : 1);
    body.animate([{ opacity: 0, transform: `translateX(${x}px)` }, { opacity: 1, transform: 'none' }], t);
  } else body.animate([{ opacity: 0 }, { opacity: 1 }], t);
}

/** Fade an element out the way it came in (the toast sinks 4px). Resolves when it's gone or the fade was cut short. */
export function leave(el: HTMLElement): Promise<unknown> {
  if (typeof el.animate !== 'function') return Promise.resolve();
  const frames = reduced() ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(4px)' }];
  return el.animate(frames, { ...timing(el), fill: 'forwards' }).finished.catch(() => undefined);
}
