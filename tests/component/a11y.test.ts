import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import type { AgentClarifier } from '../../src/index';
import { HOTEL, mount, onStep, row } from './helpers';

// axe-core reads inside shadow DOM, so this checks the real component: roles, names, contrast.
async function violations(el: AgentClarifier): Promise<string[]> {
  const r = await axe.run(el, { resultTypes: ['violations'] });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

const ALL = { ...HOTEL, flow: 'all' as const, title: 'A few quick questions' };

type Setup = (m: ReturnType<typeof mount>) => Promise<void> | void;
const VIEWS: [string, typeof HOTEL, Setup][] = [
  ['single step', HOTEL, () => {}],
  ['single step with a pick', HOTEL, (m) => row(m, 'covent').click()],
  ['multi step', HOTEL, async (m) => {
    m.el.open(HOTEL);
    row(m, 'covent').click();
    await onStep(m, 'Budget');
    row(m, 'mid').click();
    await onStep(m, 'What matters');
    row(m, 'walk').click();
  }],
  ['"Something else" typing', HOTEL, (m) => row(m, '__other').click()],
  ['all at once, after a failed send attempt', { ...ALL, questions: ALL.questions.map((q) => ({ ...q, required: true })) }, (m) => m.root.querySelector<HTMLElement>('[data-act="send"]')?.click()],
  ['all at once', ALL, (m) => row(m, 'covent').click()],
  ['review with an error', HOTEL, async (m) => {
    m.el.setAttribute('review', 'always');
    m.el.addEventListener('clarify:submit', (e) => e.preventDefault());
    for (const [q, o] of [['covent', 'Budget'], ['mid', 'What matters']] as const) {
      row(m, q).click();
      await onStep(m, o);
    }
    row(m, 'walk').click();
    m.root.querySelector<HTMLElement>('[data-act="next"]')!.click();
    await onStep(m, 'Anything');
    m.root.querySelector<HTMLElement>('[data-act="skip"]')!.click();
    await onStep(m, 'Check your answers');
    m.root.querySelector<HTMLElement>('[data-act="send"]')!.click();
    await new Promise((r) => setTimeout(r));
    m.el.setError('The server didn’t respond.');
  }],
  ['loading', HOTEL, (m) => { m.el.reset(); m.el.open({ ...HOTEL, questions: HOTEL.questions.slice(0, 1) }, { partial: true }); }],
  ['pill', HOTEL, (m) => m.el.minimise()],
  ['answered record', { ...HOTEL, questions: HOTEL.questions.slice(0, 1) }, async (m) => { row(m, 'covent').click(); await new Promise((r) => setTimeout(r, 200)); }],
  ['replied record', HOTEL, (m) => { m.el.minimise(); m.el.reply('Somewhere quiet'); }],
  ['expired record', HOTEL, (m) => m.el.expire()],
];

for (const theme of ['light', 'dark'] as const) {
  describe(`axe · ${theme}`, () => {
    it.each(VIEWS)('%s', async (_, q, setup) => {
      const m = mount(q, { theme });
      await setup(m);
      await new Promise((r) => setTimeout(r, 400)); // let the 160ms fade-in finish
      expect(await violations(m.el)).toEqual([]);
    });
  });
}
