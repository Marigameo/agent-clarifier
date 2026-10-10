// All-at-once flow: every question in one card, answered in any order (PLAN §4).
// Options become chips to save height. Errors show only after a send attempt.

import { canContinue, draftOf, isInvalid, picks, progress } from '../model/selectors';
import type { NormalizedQuestion } from '../model/types';
import { button, footLeft, header, setButton, sourceLine } from './chrome';
import { attr, h, icon, rove, text } from './dom';
import { DELEGATE, OTHER, type Ctx, type View } from './types';

interface Block {
  q: NormalizedQuestion;
  el: HTMLElement;
  chips: HTMLElement[];
  state: HTMLElement;
  error: HTMLElement;
  other: HTMLInputElement | null;
  area: HTMLTextAreaElement | null;
  delegate: HTMLElement | null;
}

function chip(id: string, role: string, label: string, opts: { quiet?: boolean; icon?: 'pencil' | 'delegate'; disabled?: boolean; out?: string; rec?: boolean } = {}): HTMLElement {
  return h(
    'span',
    {
      class: `chip${opts.quiet ? ' quiet' : ''}`,
      part: 'option',
      role,
      [role === 'button' ? 'aria-pressed' : 'aria-checked']: 'false',
      'aria-disabled': opts.disabled ? 'true' : null,
      tabindex: '-1',
      'data-opt': id,
      'data-rec': opts.rec ? '' : null,
    },
    opts.icon ? icon(opts.icon, opts.icon === 'delegate' ? 'flip' : '') : role === 'checkbox' ? icon('check', 'tick') : null,
    label,
    opts.out ? h('span', { class: 'out', 'aria-hidden': 'true' }, opts.out) : null,
  );
}

function block(q: NormalizedQuestion, i: number, init: Ctx): Block {
  const titleId = `q-${i}`;
  const role = q.type === 'multi' ? 'checkbox' : 'radio';
  const chips: HTMLElement[] = q.options.map((o) =>
    chip(o.id, role, o.label, { disabled: o.disabled, rec: o.recommended, ...(o.compose !== null ? { out: '↗' } : {}) }),
  );
  let other: HTMLInputElement | null = null;
  if (q.other) {
    chips.push(chip(OTHER, role, q.other.label ?? init.t('somethingElse'), { quiet: true, icon: 'pencil' }));
    other = h('input', {
      type: 'text',
      class: 'chip-input',
      'aria-label': q.other.label ?? init.t('somethingElse'),
      placeholder: q.other.placeholder ?? '',
      'data-input': OTHER,
      hidden: true,
    });
  }
  const delegate = q.delegate
    ? chip(DELEGATE, q.type === 'text' ? 'button' : role, init.t('decideForMe'), { quiet: true, icon: 'delegate' })
    : null;
  if (delegate && q.type !== 'text') chips.push(delegate);

  const area =
    q.type === 'text'
      ? h('textarea', { 'aria-labelledby': titleId, 'aria-required': q.required ? 'true' : null, 'data-input': 'text', rows: 2 })
      : null;
  const state = h('span', { class: 'q-state' });
  const error = h('div', { class: 'q-err', id: `${titleId}-err`, hidden: true }, icon('alert'), init.t('pickOne'));
  const group =
    q.type === 'text'
      ? h('div', { class: 'q-field' }, area, delegate)
      : h(
          'div',
          {
            class: 'chips',
            role: q.type === 'multi' ? 'group' : 'radiogroup',
            'aria-labelledby': titleId,
            'aria-describedby': `${titleId}-err`,
            'aria-required': q.required && q.type === 'single' ? 'true' : null,
          },
          chips,
        );
  const el = h(
    'div',
    { class: 'q', 'data-q': q.id },
    h(
      'div',
      { class: 'q-head' },
      h('span', { class: 'q-num', 'aria-hidden': 'true' }, String(i + 1)),
      h('h3', { class: 'q-title', id: titleId }, q.prompt, q.description ? h('span', { class: 'sub' }, q.description) : null),
      state,
    ),
    group,
    other,
    error,
  );
  return { q, el, chips, state, error, other, area, delegate };
}

export function formView(init: Ctx): View {
  const qs = init.s.q?.questions ?? [];
  const head = header(init, init.s.q?.title ?? init.t('formTitle'), undefined);
  const blocks = qs.map((q, i) => block(q, i, init));
  const left = h('span', { class: 'foot-l' });
  const skipAll = button('skip-all', 'ghost');
  const send = button('send', 'primary');
  const foot = h('div', { class: 'foot', part: 'footer' }, left, h('div', { class: 'foot-r' }, skipAll, send));
  const top = h('div', { class: 'top' }, sourceLine(init), head.el);
  const banner = h('div', { class: 'banner', part: 'banner', hidden: true });
  const el = h(
    'div',
    { class: 'card', part: 'card', role: 'group', 'aria-labelledby': 'title', tabindex: '-1' },
    h('div', { class: 'scroll' }, top, banner, h('div', { class: 'form' }, blocks.map((b) => b.el))),
    foot,
  );

  function update(ctx: Ctx): void {
    const s = ctx.s;
    const active = (el.getRootNode() as ShadowRoot | Document).activeElement;
    const busy = s.status === 'submitting';

    for (const b of blocks) {
      const d = draftOf(s, b.q.id);
      for (const c of b.chips) {
        const id = c.dataset.opt!;
        const on = id === OTHER ? d.otherActive : id === DELEGATE ? d.delegated : !d.delegated && d.values.includes(id);
        attr(c, c.getAttribute('role') === 'button' ? 'aria-pressed' : 'aria-checked', String(on));
      }
      if (b.delegate && b.q.type === 'text') attr(b.delegate, 'aria-pressed', String(d.delegated));
      if (b.chips.length) rove(b.chips, active);
      if (b.delegate && b.q.type === 'text') attr(b.delegate, 'tabindex', '0');
      if (b.other) {
        b.other.hidden = !d.otherActive;
        if (active !== b.other && b.other.value !== d.other) b.other.value = d.other;
      }
      if (b.area && active !== b.area && b.area.value !== d.text) b.area.value = d.text;

      // Errors only after a send attempt, never while someone is still answering.
      const invalid = s.attempted && isInvalid(b.q, d);
      b.el.classList.toggle('invalid', invalid);
      b.error.hidden = !invalid;
      const done = canContinue(b.q, d);
      text(
        b.state,
        done
          ? '✓'
          : b.q.required
            ? ctx.t('required')
            : b.q.type === 'multi' && b.q.max < b.q.options.length + (b.q.other ? 1 : 0)
              ? ctx.t('pickedOf', { n: picks(b.q, d), total: b.q.max })
              : '',
      );
      b.state.classList.toggle('ok', done);
      b.state.classList.toggle('err', invalid);
    }

    const failed = s.status === 'error';
    banner.hidden = !failed;
    if (failed) banner.replaceChildren(icon('alert'), h('span', {}, h('b', {}, ctx.t('sendFailed')), s.error ?? ''));

    const p = progress(s);
    footLeft(left, ctx, () => [ctx.t('answeredOf', { n: p.answered, total: p.total })]);
    // Skip all isn't offered when the agent needs an answer (a required question).
    setButton(skipAll, qs.some((q) => q.required) ? null : ctx.t('skipAll'), { disabled: busy || failed });
    send.dataset.act = failed ? 'retry' : 'send';
    const label = busy ? ctx.t('sending') : failed ? ctx.t('tryAgain') : ctx.t('send');
    setButton(send, label, { disabled: busy || p.answered === 0, busy, arrow: !busy && !failed });
  }

  return { el, update };
}
