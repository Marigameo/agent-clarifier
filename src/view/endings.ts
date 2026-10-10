// The minimised pill and the record left in the transcript.
// Placeholders: M3 gives them their real design (record kinds, picks tag, replace/dock behaviour).

import { buildAnswer, draftOf, progress } from '../model/selectors';
import { h, icon } from './dom';
import type { Ctx, View } from './types';

export function pillView(ctx: Ctx): View {
  const p = progress(ctx.s);
  const el = h(
    'div',
    { class: 'pill', part: 'pill' },
    ctx.t('answeredOf', { n: p.answered, total: p.total }),
    h('button', { class: 'btn', type: 'button', 'data-act': 'reopen', 'aria-label': ctx.t('pillLabel', { n: p.answered, total: p.total }) }, ctx.t('reopen')),
  );
  return { el, update: () => {} };
}

export function recordView(ctx: Ctx): View {
  const s = ctx.s;
  const r = s.record!;
  const qs = s.q?.questions ?? [];
  const p = progress(s);
  const [msg, action] =
    r.kind === 'skipped'
      ? [ctx.t('skippedRecord'), ctx.t('answerNow')]
      : r.kind === 'replied'
        ? [ctx.t('replied'), ctx.t('answerQuestions')]
        : r.kind === 'expired'
          ? [r.message ?? ctx.t('expiredRecord'), null]
          : [ctx.t('youAnswered', { n: p.answered, total: p.total }), ctx.t('editAnswers')];

  const rows = r.kind === 'skipped' || r.kind === 'expired'
    ? []
    : qs.map((q) => {
        const a = buildAnswer(q, draftOf(s, q.id));
        const v = a.status === 'skipped' ? ctx.t('skipped') : a.status === 'delegated' ? ctx.t('delegated') : a.labels.join(', ');
        return [h('dt', {}, q.label), h('dd', {}, v)];
      });

  const el = h(
    'div',
    { class: `record${r.kind === 'expired' ? ' expired' : ''}`, part: 'record', role: 'status' },
    h(
      'div',
      { class: 'record-head' },
      icon(r.kind === 'answered' ? 'check' : 'arrow', 'flip'),
      msg,
      action ? h('button', { class: 'btn link', type: 'button', 'data-act': 'revise' }, action) : null,
    ),
    r.kind === 'replied' ? h('p', { class: 'quote' }, `“${r.result.message ?? ''}”`) : null,
    rows.length ? h('dl', {}, rows.flat()) : null,
  );
  return { el, update: () => {} };
}

export function loadingView(ctx: Ctx): View {
  // Placeholder until step 2 (skeleton rows that fill in as questions stream).
  const el = h('div', { class: 'card', part: 'card', 'aria-busy': 'true' }, h('div', { class: 'head' }, h('span', { class: 'title' }, ctx.t('writing'))));
  return { el, update: () => {} };
}
