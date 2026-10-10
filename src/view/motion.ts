// Motion answers "what just happened?" (DESIGN §1, §7). Never decoration.
// - The card's height animates between views, so the page doesn't jump.
// - A new step slides 12px in the reading direction (back slides the other way), with a fade.
// - With reduced motion, every change is instant.

export type Move = 'forward' | 'back' | 'swap' | 'open';

export const reduced = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

function token(el: Element, name: string, fallback: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

/**
 * Animate a freshly swapped-in view.
 * @param from the old view's height (0 when nothing was shown)
 */
export function enter(el: HTMLElement, from: number, move: Move, rtl: boolean): void {
  if (reduced() || typeof el.animate !== 'function') return;
  const duration = parseFloat(token(el, '--_duration', '160')) || 160;
  const easing = token(el, '--_ease', 'ease-out');
  const to = el.getBoundingClientRect().height;

  if (move === 'open') {
    el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration, easing });
    return;
  }
  if (from && to && Math.abs(from - to) > 1) {
    el.animate([{ blockSize: `${from}px`, overflow: 'hidden' }, { blockSize: `${to}px`, overflow: 'hidden' }], { duration, easing });
  }
  const body = el.querySelector('.scroll') ?? el;
  const sign = (move === 'back' ? -1 : 1) * (rtl ? -1 : 1);
  const x = move === 'swap' ? 0 : 12 * sign;
  body.animate([{ opacity: 0, transform: `translateX(${x}px)` }, { opacity: 1, transform: 'none' }], { duration, easing });
}
