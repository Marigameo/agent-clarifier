// The parts every card shares: the "asked by" line, the header and the footer.

import { attr, bdi, h, icon, text } from './dom';
import type { State } from '../model/types';
import type { Ctx } from './types';

export function sourceLine(ctx: Ctx): HTMLElement | null {
  const source = ctx.s.q?.source;
  return source ? h('div', { class: 'source' }, h('span', { class: 't' }, ctx.t('askedBy', { source }))) : null;
}

/** Header: [Back] Title / subtitle [step] [Minimise]. Back and step are optional. */
export function header(
  ctx: Ctx,
  title: string,
  sub: string | undefined,
  opts: { back?: boolean; step?: boolean } = {},
): { el: HTMLElement; back: HTMLButtonElement | null; step: HTMLElement | null } {
  const back = opts.back
    ? h('button', { class: 'icon-btn', type: 'button', 'data-act': 'back', 'aria-label': ctx.t('back') }, icon('back', 'flip'))
    : null;
  const step = opts.step ? h('span', { class: 'step', part: 'step' }) : null;
  const el = h(
    'div',
    { class: 'head', part: 'header' },
    back,
    h('h2', { class: 'title', id: 'title', part: 'title' }, bdi(title), sub ? h('span', { class: 'sub' }, bdi(sub)) : null),
    h(
      'div',
      { class: 'meta' },
      step,
      h('button', { class: 'icon-btn', type: 'button', 'data-act': 'minimise', 'aria-label': ctx.t('minimise') }, icon('minimise')),
    ),
  );
  return { el, back, step };
}

/** The send-failed banner, shared by every view that can send. Hidden until a send fails. */
export function failBanner(): HTMLElement {
  return h('div', { class: 'banner', part: 'banner', hidden: true });
}

export function setFailBanner(b: HTMLElement, ctx: Ctx): void {
  const failed = ctx.s.status === 'error';
  b.hidden = !failed;
  // With no reason from the app, it still says the answers are safe (round 12).
  if (failed) b.replaceChildren(icon('alert'), h('span', {}, h('b', {}, ctx.t('sendFailed')), ctx.s.error || ctx.t('answersKept')));
}

/** A footer button that is built once and shown, hidden, enabled or relabelled on update. */
export function button(act: string, cls: string): HTMLButtonElement {
  return h('button', { class: `btn ${cls}`, type: 'button', 'data-act': act, part: cls === 'primary' ? 'button button-primary' : 'button' });
}

export function setButton(
  b: HTMLButtonElement,
  label: string | null,
  opts: { disabled?: boolean; arrow?: boolean; busy?: boolean } = {},
): void {
  attr(b, 'hidden', label === null);
  if (label === null) return;
  // Unavailable buttons stay focusable (aria-disabled, never disabled): disabling a focused button
  // drops keyboard focus to the page (round 11), and a disabled one leaves the Tab order with no
  // reason given (round 12). Clicks on them are ignored in element.ts.
  b.disabled = false;
  attr(b, 'aria-disabled', opts.disabled || opts.busy ? 'true' : null);
  const key = `${label}|${opts.arrow ? 1 : 0}|${opts.busy ? 1 : 0}`;
  if (b.dataset.key === key) return;
  b.dataset.key = key;
  b.replaceChildren(opts.busy ? h('span', { class: 'spin', 'aria-hidden': 'true' }) : '', label, opts.arrow ? icon('arrow', 'flip') : '');
}

/**
 * Is the undo window after Send still open? Only then is there an Undo to offer; once it closes
 * the answers are on their way, even while the app is still sending them (round 12).
 */
export const undoOpen = (s: State): boolean => s.status === 'submitting' && s.undoUntil !== null && Date.now() < s.undoUntil;

/** The footer's left side: a toast when there is one, otherwise the given content. */
export function footLeft(el: HTMLElement, ctx: Ctx, content: () => (Node | string)[]): void {
  const toast = ctx.s.toast;
  // The undo window after Send: a countdown with Undo, in the same place as a toast.
  const until = undoOpen(ctx.s) ? ctx.s.undoUntil : null;
  if (until) {
    const s = Math.max(1, Math.ceil((until - Date.now()) / 1000));
    const msg = ctx.t('sendingIn', { s });
    const current = el.querySelector('.toast > .msg');
    if (current) text(current, msg);
    else {
      el.replaceChildren(
        h('span', { class: 'toast', part: 'toast' }, h('span', { class: 'msg' }, msg),
          h('button', { class: 'btn link', type: 'button', 'data-act': 'undo-send' }, icon('undo', 'flip'), ctx.t('undo'))),
      );
    }
    return;
  }
  if (!toast) {
    el.replaceChildren(...content());
    return;
  }
  const q = toast.kind === 'skipped' ? ctx.s.q?.questions.find((x) => x.id === toast.questionId) : undefined;
  const msg =
    toast.kind === 'skipped'
      ? ctx.t('skippedToast', { label: q?.label ?? '' })
      : toast.kind === 'cleared'
        ? ctx.t('clearedToast')
        : ctx.t('upTo', { max: toast.max });
  const undo =
    toast.kind === 'limit'
      ? null
      : h('button', { class: 'btn link', type: 'button', 'data-act': 'undo' }, icon('undo', 'flip'), ctx.t('undo'));
  const current = el.firstElementChild;
  if (current?.classList.contains('toast') && current.textContent === msg + (undo ? ctx.t('undo') : '')) return;
  // The message wraps if it must (it names what Undo restores); Undo always stays whole.
  // Without Undo it's a notice, not a toast to act on: drawn as quiet text (round 17).
  const cls = undo ? 'toast' : 'toast notice';
  el.replaceChildren(h('span', { class: cls, part: cls }, h('span', { class: 'msg' }, msg), undo));
}

export { text };
