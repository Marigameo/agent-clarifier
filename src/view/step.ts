// Sequential flow: one question per card (PLAN §4).

import { canContinue, draftOf, needsReview, picks, questionState } from '../model/selectors';
import type { NormalizedOption, NormalizedQuestion } from '../model/types';
import { button, footLeft, header, setButton, sourceLine } from './chrome';
import { attr, h, icon, text } from './dom';
import { DELEGATE, OTHER, type Ctx, type View } from './types';

function optionRow(q: NormalizedQuestion, o: NormalizedOption, i: number, ctx: Ctx): HTMLElement {
  const multi = q.type === 'multi';
  return h(
    'div',
    {
      class: 'opt',
      part: 'option',
      role: multi ? 'checkbox' : 'radio',
      'aria-checked': 'false',
      'aria-disabled': o.disabled ? 'true' : null,
      tabindex: '-1',
      'data-opt': o.id,
    },
    multi
      ? h('span', { class: 'key box', part: 'option-key', 'aria-hidden': 'true' }, icon('check'))
      : h('span', { class: 'key', part: 'option-key', 'aria-hidden': 'true' }, String(i + 1)),
    h(
      'span',
      { class: 'body' },
      h('span', { class: 'label', part: 'option-label' }, o.label, o.recommended ? h('span', { class: 'badge', part: 'badge' }, ctx.t('recommended')) : null),
      o.description ? h('span', { class: 'desc', part: 'option-description' }, o.description) : null,
    ),
    o.compose !== null
      ? h('span', { class: 'out', 'aria-hidden': 'true' }, ctx.t('writeIt'))
      : multi
        ? null
        : h('span', { class: 'trail', 'aria-hidden': 'true' }, icon('arrow', 'flip')),
  );
}

function otherRow(q: NormalizedQuestion, ctx: Ctx): HTMLElement {
  const label = q.other?.label ?? ctx.t('somethingElse');
  return h(
    'div',
    {
      class: 'opt other quiet',
      part: 'other',
      role: q.type === 'multi' ? 'checkbox' : 'radio',
      'aria-checked': 'false',
      tabindex: '-1',
      'data-opt': OTHER,
    },
    h('span', { class: 'key plain', 'aria-hidden': 'true' }, icon('pencil')),
    h('span', { class: 'body' }, h('span', { class: 'label' }, label)),
    h('input', { type: 'text', 'aria-label': label, placeholder: q.other?.placeholder ?? '', 'data-input': OTHER, enterkeyhint: 'next' }),
    h('span', { class: 'enter', 'aria-hidden': 'true' }, '↵'),
  );
}

function delegateRow(q: NormalizedQuestion, ctx: Ctx): HTMLElement {
  const role = q.type === 'single' ? 'radio' : q.type === 'multi' ? 'checkbox' : 'button';
  return h(
    'div',
    {
      class: 'opt delegate quiet',
      part: 'option delegate',
      role,
      [role === 'button' ? 'aria-pressed' : 'aria-checked']: 'false',
      'aria-description': q.type === 'multi' ? ctx.t('clearsPicks') : null,
      tabindex: '-1',
      'data-opt': DELEGATE,
    },
    h('span', { class: 'key plain', 'aria-hidden': 'true' }, icon('delegate', 'flip')),
    h('span', { class: 'body' }, h('span', { class: 'label' }, ctx.t('decideForMe'))),
  );
}

export function stepView(init: Ctx): View {
  const s0 = init.s;
  const qs = s0.q?.questions ?? [];
  const q = qs[s0.step]!;
  const head = header(init, q.prompt, q.description, { back: true, step: true });

  // Body: option rows, or a text field
  const rows: HTMLElement[] = [];
  let other: HTMLElement | null = null;
  let input: HTMLInputElement | null = null;
  let area: HTMLTextAreaElement | null = null;
  let body: HTMLElement;
  if (q.type === 'text') {
    area = h('textarea', {
      'aria-labelledby': 'title',
      'aria-required': q.required ? 'true' : null,
      'data-input': 'text',
      rows: 3,
      placeholder: '',
      enterkeyhint: 'next',
    });
    body = h('div', { class: 'field' }, area);
  } else {
    q.options.forEach((o, i) => rows.push(optionRow(q, o, i, init)));
    if (q.other) {
      other = otherRow(q, init);
      input = other.querySelector('input');
      rows.push(other);
    }
    body = h(
      'div',
      { class: 'list', role: q.type === 'multi' ? 'group' : 'radiogroup', 'aria-labelledby': 'title', 'aria-required': q.required ? 'true' : null },
      rows,
    );
  }
  const delegate = q.delegate ? delegateRow(q, init) : null;
  if (delegate) body.append(delegate);

  // Footer
  const left = h('span', { class: 'foot-l' });
  const skip = button('skip', 'ghost');
  const primary = button('next', 'primary');
  const foot = h('div', { class: 'foot', part: 'footer' }, left, h('div', { class: 'foot-r' }, skip, primary));

  const top = h('div', { class: 'top' }, sourceLine(init), head.el);
  const el = h('div', { class: 'card', part: 'card', role: 'group', 'aria-labelledby': 'title' }, h('div', { class: 'scroll' }, top, body), foot);

  function update(ctx: Ctx): void {
    const s = ctx.s;
    const d = draftOf(s, q.id);
    const last = s.step === qs.length - 1;
    const busy = s.status === 'submitting';

    attr(head.back!, 'hidden', s.step === 0);
    text(head.step!, ctx.t('stepOf', { n: s.step + 1, total: qs.length }));

    for (const row of rows) {
      const id = row.dataset.opt!;
      const on = id === OTHER ? d.otherActive : !d.delegated && d.values.includes(id);
      attr(row, 'aria-checked', String(on));
    }
    // Never overwrite a field while the user is typing in it (that would move the caret).
    const active = (el.getRootNode() as ShadowRoot | Document).activeElement;
    if (other && input) {
      other.classList.toggle('typing', d.otherActive);
      if (active !== input && input.value !== d.other) input.value = d.other;
    }
    if (area && active !== area && area.value !== d.text) area.value = d.text;
    if (delegate) attr(delegate, delegate.getAttribute('role') === 'button' ? 'aria-pressed' : 'aria-checked', String(d.delegated));

    // Footer left: progress dots, "n of max picked", or the new-line hint; a toast wins.
    footLeft(left, ctx, () => {
      if (q.type === 'multi' && q.max < q.options.length + (q.other ? 1 : 0)) {
        return [ctx.t('pickedOf', { n: picks(q, d), total: q.max })];
      }
      if (q.type === 'text') return [h('kbd', {}, '⇧↵'), ctx.t('newLine')];
      return [
        h(
          'span',
          { class: 'dots', 'aria-hidden': 'true' },
          qs.map((x, i) =>
            h('i', { class: questionState(x, draftOf(s, x.id)) === 'skipped' ? 'skip' : i <= s.step ? 'on' : '' }),
          ),
        ),
      ];
    });

    // Skip is replaced by "Decide for me" on delegate questions, and never offered on required ones.
    setButton(skip, q.required || q.delegate ? null : ctx.t('skip'), { disabled: busy });

    // Single moves on by itself, so its Continue only appears once there's something to confirm.
    const ready = canContinue(q, d);
    const showPrimary = q.type !== 'single' || d.otherActive || ready || busy;
    const label =
      s.returnTo === 'review'
        ? ctx.t('review')
        : !last
          ? ctx.t('continue')
          : needsReview(s, ctx.review)
            ? ctx.t('review')
            : ctx.t('send');
    setButton(primary, showPrimary ? (busy ? ctx.t('sending') : label) : null, { disabled: !ready || busy, arrow: !busy, busy });
  }

  return { el, update };
}
