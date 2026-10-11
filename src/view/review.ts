// Review: every answer in one list, each with Edit (PLAN §5, §6).

import { buildAnswer, draftOf } from '../model/selectors';
import { backButton, button, failBanner, footLeft, header, setButton, setFailBanner, sourceLine, undoOpen } from './chrome';
import { bdi, h, icon } from './dom';
import type { Ctx, View } from './types';

export function reviewView(init: Ctx): View {
  const qs = init.s.q?.questions ?? [];
  const head = header(init, init.t('checkAnswers'), undefined);
  const list = h('dl', { class: 'review' });
  const banner = failBanner();
  const left = h('span', { class: 'foot-l' });
  const send = button('send', 'primary');
  const foot = h('div', { class: 'foot', part: 'footer' }, backButton(init), left, h('div', { class: 'foot-r' }, send));
  const top = h('div', { class: 'top' }, sourceLine(init), head.el);
  const el = h('div', { class: 'card', part: 'card', role: 'group', 'aria-labelledby': 'title', tabindex: '-1' }, h('div', { class: 'scroll' }, top, banner, list), foot);

  function update(ctx: Ctx): void {
    const s = ctx.s;
    const busy = s.status === 'submitting';

    // The list is small and only changes between visits, so it's rebuilt; nothing in it holds focus
    // while answers change.
    const key = JSON.stringify(s.drafts);
    if (list.dataset.key !== key) {
      list.dataset.key = key;
      list.replaceChildren(
        ...qs.map((q) => {
          const a = buildAnswer(q, draftOf(s, q.id));
          const gap = a.status === 'skipped';
          const value = gap ? ctx.t('skipped') : a.status === 'delegated' ? ctx.t('delegated') : ctx.list(a.labels);
          return h(
            'div',
            { class: `row${gap ? ' gap flag' : ''}` },
            h('dt', {}, bdi(q.label)),
            h('dd', {}, bdi(value)),
            // A second dd holds the action: dl rows may only contain dt and dd.
            h(
              'dd',
              { class: 'act' },
              h(
                'button',
                {
                  class: 'btn link',
                  type: 'button',
                  'data-act': 'edit',
                  'data-q': q.id,
                  // The spoken name starts with the visible word (WCAG 2.5.3).
                  'aria-label': ctx.t(gap ? 'answerLabel' : 'editLabel', { label: q.label }),
                },
                gap ? ctx.t('answer') : ctx.t('edit'),
              ),
            ),
          );
        }),
      );
    }

    setFailBanner(banner, ctx);

    footLeft(left, ctx, () => [
      h('button', { class: 'btn ghost', type: 'button', 'data-act': 'start-over', disabled: busy }, icon('undo', 'flip'), ctx.t('startOver')),
    ]);
    // During the undo window the button keeps its label, dimmed; "Sending…" only once it really
    // sends, so it never looks too late to undo (round 12, Mari's pick).
    const sending = busy && !undoOpen(s);
    const label = sending ? ctx.t('sending') : s.status === 'error' ? ctx.t('tryAgain') : ctx.t('sendAnswers');
    send.dataset.act = s.status === 'error' ? 'retry' : 'send';
    setButton(send, label, { disabled: busy, busy: sending, arrow: !sending && s.status !== 'error' });
  }

  return { el, update };
}
