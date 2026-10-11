// Sequential flow: one question per card (PLAN §4).

import { canContinue, draftOf, isSettled, needsReview, picks, questionState } from '../model/selectors';
import type { NormalizedOption, NormalizedQuestion } from '../model/types';
import { button, failBanner, footLeft, header, setButton, setFailBanner, sourceLine } from './chrome';
import { attr, bdi, h, icon, rove, text } from './dom';
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
      'data-rec': o.recommended ? '' : null,
    },
    multi
      ? h('span', { class: 'key box', part: 'option-key', 'aria-hidden': 'true' }, icon('check'))
      : h('span', { class: 'key', part: 'option-key', 'aria-hidden': 'true' }, String(i + 1)),
    h(
      'span',
      { class: 'body' },
      h('span', { class: 'label', part: 'option-label' }, bdi(o.label), o.recommended ? h('span', { class: 'badge', part: 'badge' }, ctx.t('recommended')) : null),
      o.description ? h('span', { class: 'desc', part: 'option-description' }, bdi(o.description)) : null,
    ),
    o.compose !== null
      ? h('span', { class: 'out', 'aria-hidden': 'true' }, ctx.t('writeIt'))
      : multi
        ? null
        : h('span', { class: 'trail', 'aria-hidden': 'true' }, icon('arrow', 'flip')),
  );
}

/**
 * "Something else": a radio/checkbox row, plus a text field that opens just below it.
 * The field is a sibling, not inside the row: a text box nested inside a radio confuses screen
 * readers (axe: nested-interactive). Round 8, Claude's call.
 */
function otherRow(q: NormalizedQuestion, ctx: Ctx): [HTMLElement, HTMLElement] {
  const label = q.other?.label ?? ctx.t('somethingElse');
  const row = h(
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
    h('span', { class: 'body' }, h('span', { class: 'label' }, bdi(label))),
  );
  const field = h(
    'div',
    { class: 'other-field', hidden: true },
    h('input', { type: 'text', 'aria-label': label, placeholder: q.other?.placeholder ?? '', 'data-input': OTHER, enterkeyhint: 'next' }),
    h('span', { class: 'enter', 'aria-hidden': 'true' }, '↵'),
  );
  return [row, field];
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
  let field: HTMLElement | null = null;
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
      [other, field] = otherRow(q, init);
      input = field.querySelector('input');
      rows.push(other);
    }
    body = h(
      'div',
      // aria-required is only allowed on radiogroup (single); a required multi says so in its error.
      { class: 'list', role: q.type === 'multi' ? 'group' : 'radiogroup', 'aria-labelledby': 'title', 'aria-required': q.required && q.type === 'single' ? 'true' : null },
      rows,
      field,
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
  // A card with no review step sends from here, so it shows the failure here too (round 11).
  const banner = failBanner();
  const el = h('div', { class: 'card', part: 'card', role: 'group', 'aria-labelledby': 'title', tabindex: '-1' }, h('div', { class: 'scroll' }, top, banner, body), foot);
  const group = delegate && q.type !== 'text' ? [...rows, delegate] : rows;

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
    if (field && input) {
      field.hidden = !d.otherActive;
      if (active !== input && input.value !== d.other) input.value = d.other;
    }
    if (area && active !== area && area.value !== d.text) area.value = d.text;
    if (delegate) attr(delegate, delegate.getAttribute('role') === 'button' ? 'aria-pressed' : 'aria-checked', String(d.delegated));
    if (group.length) rove(group, active);
    else if (delegate) attr(delegate, 'tabindex', '0');

    // Footer left: progress dashes (always, so you can jump back from any step), plus the pick
    // count on limited multi-selects or the new-line hint on text. A toast replaces them for a while.
    footLeft(left, ctx, () => {
      const dots = h(
        'span',
        { class: 'dots' },
        qs.map((x, i) => {
          const d2 = draftOf(s, x.id);
          const cls = questionState(x, d2) === 'skipped' ? 'skip' : i <= s.step ? 'on' : '';
          // Settled steps are buttons, so you can jump straight back to one (PLAN §6).
          return i !== s.step && isSettled(x, d2)
            ? h('button', { class: `dot ${cls}`, type: 'button', 'data-act': 'goto', 'data-step': i, 'aria-label': ctx.t('goTo', { n: i + 1, label: x.label }) })
            : h('i', { class: `dot ${cls}`, 'aria-hidden': 'true' });
        }),
      );
      // Below a minimum, say what unlocks Continue (round 11). Kept at every width: it's the reason.
      if (q.type === 'multi' && q.min > 1 && picks(q, d) < q.min) {
        return [dots, h('span', { class: 'count need' }, ctx.t('pickAtLeast', { min: q.min }))];
      }
      if (q.type === 'multi' && q.max < q.options.length + (q.other ? 1 : 0)) {
        return [dots, h('span', { class: 'count' }, ctx.t('pickedOf', { n: picks(q, d), total: q.max }))];
      }
      if (q.type === 'text') return [dots, h('span', { class: 'keys' }, h('kbd', {}, '⇧↵'), ctx.t('newLine'))];
      return [dots];
    });

    // Skip is replaced by "Decide for me" on delegate questions, and never offered on required ones.
    const failed = s.status === 'error';
    setFailBanner(banner, ctx);
    setButton(skip, q.required || q.delegate ? null : ctx.t('skip'), { disabled: busy || failed });

    // Single moves on by itself, so its Continue only appears once there's something to confirm.
    const ready = canContinue(q, d);
    const showPrimary = q.type !== 'single' || d.otherActive || ready || busy || failed;
    primary.dataset.act = failed ? 'retry' : 'next';
    const label = failed
      ? ctx.t('tryAgain')
      : s.returnTo === 'review'
        ? ctx.t('review')
        : !last
          ? ctx.t('continue')
          : needsReview(s, ctx.review)
            ? ctx.t('review')
            : ctx.t('send');
    setButton(primary, showPrimary ? (busy ? ctx.t('sending') : label) : null, { disabled: !failed && (!ready || busy), arrow: !busy && !failed, busy });
  }

  return { el, update };
}
