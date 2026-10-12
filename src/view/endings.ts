// The minimised pill and the record left in the transcript.
// Placeholders: M3 gives them their real design (record kinds, picks tag, replace/dock behaviour).

import { buildAnswer, draftOf, progress } from '../model/selectors.js';
import { header } from './chrome.js';
import { attr, bdi, h, icon, text } from './dom.js';
import type { Ctx, View } from './types.js';

export function pillView(init: Ctx): View {
  const t = h('span', { class: 't' });
  const btn = h('button', { class: 'btn', type: 'button', 'data-act': 'reopen' }, init.t('reopen'));
  const el = h('div', { class: 'pill', part: 'pill' }, t, btn);
  // Updated, not built once: questions can keep streaming in while the card is minimised (round 23).
  function update(ctx: Ctx): void {
    const p = progress(ctx.s);
    const vars = { n: p.answered, total: p.total };
    text(t, ctx.t('answeredOf', vars));
    attr(btn, 'aria-label', ctx.t('pillLabel', vars));
  }
  return { el, update };
}

/**
 * The record left in the transcript (PLAN §5, board E3–E6). It says what happened in one line,
 * offers the way back, and lists answers only where they add something.
 */
export function recordView(ctx: Ctx): View {
  const s = ctx.s;
  const r = s.record!;
  const qs = s.q?.questions ?? [];
  const p = progress(s);
  const picked = qs.filter((q) => buildAnswer(q, draftOf(s, q.id)).status !== 'skipped').length;

  let mark: 'check' | 'arrow' | 'pencil' | 'clock';
  let line: string;
  let action: string | null;
  switch (r.kind) {
    case 'answered':
      [mark, line, action] = ['check', ctx.t('youAnswered', { n: p.answered, total: p.total }), ctx.t('editAnswers')];
      break;
    case 'skipped':
      [mark, line, action] = ['arrow', ctx.t('skippedRecord'), ctx.t('answerNow')];
      break;
    case 'replied':
      // The message itself is the user's own chat bubble; the record only says what it answered.
      [mark, line, action] = ['pencil', picked ? ctx.t('repliedPicks', { n: picked }) : ctx.t('replied'), ctx.t('answerQuestions')];
      break;
    default:
      [mark, line, action] = ['clock', r.message ?? ctx.t('expiredRecord'), null];
  }

  // Answers are listed when the card was answered, or when an expired card had some picks.
  const showList = r.kind === 'answered' || (r.kind === 'expired' && picked > 0);
  const rows = showList
    ? qs.map((q) => {
        const a = buildAnswer(q, draftOf(s, q.id));
        const gap = a.status === 'skipped';
        const v = gap ? ctx.t('skipped') : a.status === 'delegated' ? ctx.t('delegated') : ctx.list(a.labels);
        // Answers wrap: a hover-only tooltip was no way to read them on touch or keyboard (round 11).
        return [h('dt', {}, bdi(q.label)), h('dd', { class: gap ? 'gap' : null }, bdi(v))];
      })
    : [];

  const el = h(
    'div',
    { class: `record ${r.kind}`, part: 'record', role: 'group', 'aria-label': line, tabindex: '-1' },
    h(
      'div',
      { class: 'record-head' },
      icon(mark, mark === 'arrow' ? 'flip' : ''),
      h('span', { class: 'record-line' }, line),
      action ? h('button', { class: 'btn link', type: 'button', 'data-act': 'revise' }, action) : null,
    ),
    rows.length ? h('dl', {}, rows.flat()) : null,
  );
  return { el, update: () => {} };
}

// Classes rather than inline styles, so a strict Content-Security-Policy can't block them.
const bar = (w: 'l' | 'm' | 's'): HTMLElement => h('span', { class: `sk sk-${w}` });

/**
 * Loading (board E1): shows what has arrived so far: the first question and its options, with
 * skeleton rows for what's still coming. Nothing can be picked until the questions are complete,
 * so a click never lands on a row that's about to shift.
 */
export function loadingView(init: Ctx): View {
  const head = header(init, '', undefined, { step: true });
  const title = head.el.querySelector('.title')!;
  // The source can arrive mid-stream, so this line is updated, not built once.
  const sourceText = h('span', { class: 't' });
  const source = h('div', { class: 'source', hidden: true }, sourceText);
  const list = h('div', { class: 'list', 'aria-hidden': 'true' });
  const foot = h('div', { class: 'foot', part: 'footer' }, h('span', { class: 'foot-l' }, h('span', { class: 'spin', 'aria-hidden': 'true' }), init.t('writing')));
  const el = h(
    'div',
    { class: 'card loading', part: 'card', role: 'group', 'aria-labelledby': 'title', 'aria-busy': 'true' },
    h('div', { class: 'scroll' }, h('div', { class: 'top' }, source, head.el), list),
    foot,
  );

  function update(ctx: Ctx): void {
    const q = ctx.s.q?.questions[0];
    const from = ctx.s.q?.source;
    source.hidden = !from;
    text(sourceText, from ? ctx.t('askedBy', { source: from }) : '');
    title.replaceChildren(q ? bdi(q.prompt) : bar('l'));
    text(head.step!, ctx.t('stepOfMore', { n: 1 }));
    // Draw arrived options in full (badge, description), so nothing jumps when streaming ends.
    const rows = (q?.options ?? []).map((o, i) =>
      h(
        'div',
        { class: 'opt' },
        h('span', { class: 'key' }, String(i + 1)),
        h(
          'span',
          { class: 'body' },
          h('span', { class: 'label' }, bdi(o.label), o.recommended ? h('span', { class: 'badge' }, ctx.t('recommended')) : null),
          o.description ? h('span', { class: 'desc' }, bdi(o.description)) : null,
        ),
      ),
    );
    // Two placeholder rows for what's still coming.
    for (const w of ['m', 's'] as const) {
      const n = rows.length + 1;
      rows.push(h('div', { class: 'opt' }, h('span', { class: 'key' }, String(n)), h('span', { class: 'body' }, bar(w))));
    }
    list.replaceChildren(...rows);
  }

  return { el, update };
}
