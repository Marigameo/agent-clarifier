// The parts every card shares: the "asked by" line, the header and the footer.

import { attr, h, icon, text } from './dom';
import type { Ctx } from './types';

export function sourceLine(ctx: Ctx): HTMLElement | null {
  const source = ctx.s.q?.source;
  return source ? h('div', { class: 'source' }, ctx.t('askedBy', { source })) : null;
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
    h('h2', { class: 'title', id: 'title', part: 'title' }, title, sub ? h('span', { class: 'sub' }, sub) : null),
    h(
      'div',
      { class: 'meta' },
      step,
      h('button', { class: 'icon-btn', type: 'button', 'data-act': 'minimise', 'aria-label': ctx.t('minimise') }, icon('minimise')),
    ),
  );
  return { el, back, step };
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
  b.disabled = !!opts.disabled;
  const key = `${label}|${opts.arrow ? 1 : 0}|${opts.busy ? 1 : 0}`;
  if (b.dataset.key === key) return;
  b.dataset.key = key;
  b.replaceChildren(opts.busy ? h('span', { class: 'spin', 'aria-hidden': 'true' }) : '', label, opts.arrow ? icon('arrow', 'flip') : '');
}

/** The footer's left side: a toast when there is one, otherwise the given content. */
export function footLeft(el: HTMLElement, ctx: Ctx, content: () => (Node | string)[]): void {
  const toast = ctx.s.toast;
  // The undo window after Send: a countdown with Undo, in the same place as a toast.
  const until = ctx.s.status === 'submitting' ? ctx.s.undoUntil : null;
  if (until) {
    const s = Math.max(1, Math.ceil((until - Date.now()) / 1000));
    const msg = ctx.t('sendingIn', { s });
    const current = el.querySelector('.toast > .msg');
    if (current) text(current, msg);
    else {
      el.replaceChildren(
        h('span', { class: 'toast', part: 'toast' }, h('span', { class: 'msg' }, msg),
          h('button', { class: 'btn link', type: 'button', 'data-act': 'undo-send' }, icon('undo'), ctx.t('undo'))),
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
      : h('button', { class: 'btn link', type: 'button', 'data-act': 'undo' }, icon('undo'), ctx.t('undo'));
  const current = el.firstElementChild;
  if (current?.classList.contains('toast') && current.textContent === msg + (undo ? ctx.t('undo') : '')) return;
  // One line: the message shortens with an ellipsis, Undo always stays whole.
  el.replaceChildren(h('span', { class: 'toast', part: 'toast' }, h('span', { class: 'msg', title: msg }, msg), undo));
}

export { text };
