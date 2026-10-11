// Scratch harness for the `break` skill (round 13): the real component, once per scenario.
// The page adds labels, container widths and fixture data only. Delete demo/break.* when done.
import '../src/index';
import type { AgentClarifier, Questionnaire } from '../src/index';

type Setup = (el: AgentClarifier) => void | Promise<void>;
interface Case { axis: string; name: string; width?: string; attrs?: Record<string, string>; q?: Questionnaire; setup?: Setup; note?: string; squeeze?: boolean; lang?: string }

const opt = (label: string, description?: string, extra: object = {}) => ({ id: label.toLowerCase().replace(/\W+/g, '-').slice(0, 30) || 'x', label, description, ...extra });
const one = (prompt: string, options = [opt('Covent Garden', 'Theatres, restaurants, busy at night'), opt('South Bank', 'River views, galleries, quieter', { recommended: true }), opt('Kensington', 'Museums and parks, residential')]): Questionnaire =>
  ({ id: 'q', source: 'Trip planner', questions: [{ id: 'a', label: 'Area', prompt, type: 'single', options }] });

const LONG_WORD = 'Donaudampfschiffahrtsgesellschaftskapitänsmützenabzeichen';
const URL = 'https://example.com/projects/2026/q4/reporting-pipeline/migration-plan?step=cutover&owner=data-platform&ref=AGENT-4821';
const SENTENCES = 'Your current pipeline writes about 40 million events a day into the legacy cluster. Three dashboards depend on tables that will be renamed in the new warehouse. How should I handle the cut-over so that nobody loses data or sees broken charts during the switch?';
const many = (n: number, flow: 'sequential' | 'all' = 'sequential'): Questionnaire => ({
  id: `many-${n}-${flow}`, flow,
  questions: Array.from({ length: n }, (_, i) => ({ id: `q${i}`, label: `Question ${i + 1}`, prompt: `Question ${i + 1}: which option fits best?`, type: 'single' as const, options: [opt('First option'), opt('Second option'), opt('Third option')] })),
});
const HOTEL: Questionnaire = {
  id: 'hotel', source: 'Trip planner',
  questions: [
    { id: 'area', label: 'Area', prompt: 'Which area would you like to stay in?', type: 'single', options: [opt('Covent Garden', 'Theatres, restaurants, busy at night'), opt('South Bank', 'River views, galleries, quieter', { recommended: true }), opt('Kensington', 'Museums and parks, residential')] },
    { id: 'budget', label: 'Budget', prompt: 'What’s your budget per night?', type: 'single', delegate: true, options: [opt('$250–400'), opt('$400–600'), opt('$600+')] },
    { id: 'extras', label: 'Priorities', prompt: 'What matters most?', type: 'multi', max: 2, options: [opt('Walkable'), opt('Quiet at night'), opt('Gym or pool')] },
    { id: 'notes', label: 'Notes', prompt: 'Anything else I should know?', type: 'text' },
  ],
};

// Drive a state through the component's own controls (its public surface), not by reaching into it.
const tap = (el: AgentClarifier, css: string) => (el.shadowRoot!.querySelector(css) as HTMLElement | null)?.click();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CASES: Case[] = [
  // ── content length ──
  { axis: 'Content length', name: 'Empty prompt and empty option labels', q: one('', [opt(''), opt('', 'A description with no label')]) },
  { axis: 'Content length', name: 'One word everywhere', q: one('Budget?', [opt('Low'), opt('High')]) },
  { axis: 'Content length', name: 'Typical (baseline)', q: HOTEL },
  { axis: 'Content length', name: 'Several sentences: prompt and descriptions', q: one(SENTENCES, [opt('Dual-write for two weeks, then switch over once every dashboard has been checked', SENTENCES), opt('Backfill first', SENTENCES)]) },
  { axis: 'Content length', name: 'Unbreakable strings: URL prompt, compound label, long source', q: { ...one(`Should I use ${URL}?`, [opt(LONG_WORD, URL), opt('No')]), source: `${LONG_WORD}-assistant (MCP: ${URL})` } },
  { axis: 'Content length', name: 'Long question label in the Skip toast', q: { ...HOTEL, questions: [{ ...HOTEL.questions[0]!, label: `${LONG_WORD} and transport preferences` }, ...HOTEL.questions.slice(1)] }, setup: (el) => tap(el, '[data-act="skip"]') },
  { axis: 'Content length', name: 'Long typed answer in "Something else", then the record', q: one('Which area?'), setup: async (el) => {
    tap(el, '[data-opt="__other"]'); await wait(50);
    const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.other-field textarea')!;
    input.value = `${URL} ${LONG_WORD}`; input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    tap(el, '[data-act="next"]');
  } },
  { axis: 'Content length', name: 'Long error message from the app', q: one('Include flights?', [opt('Yes'), opt('No')]), attrs: { review: 'never' }, setup: async (el) => {
    el.addEventListener('clarify:submit', (e) => e.preventDefault());
    tap(el, '[data-opt="yes"]'); await wait(200);
    el.setError(`The server returned 503 (Service Unavailable) while posting to ${URL}. ${SENTENCES}`);
  } },

  // ── content shape ──
  { axis: 'Content shape', name: 'Emoji alone and mixed', q: one('🍕 or 🍣 tonight? 🎉', [opt('🍕'), opt('Pizza 🍕 night with friends 🎉🎉', '👨‍👩‍👧‍👦 family size'), opt('🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣🍣')]) },
  { axis: 'Content shape', name: 'Right-to-left (Arabic)', lang: 'ar', attrs: { dir: 'rtl' }, q: one('أي منطقة تفضل للإقامة؟', [opt('كوفنت غاردن', 'مسارح ومطاعم'), opt('ساوث بانك', 'إطلالات على النهر', { recommended: true })]) },
  { axis: 'Content shape', name: 'Mixed direction: Latin names in an Arabic card', lang: 'ar', attrs: { dir: 'rtl' }, q: { ...one('بأي لغة نكتب الخدمة؟ (C++ أو .NET)', [opt('C++'), opt('.NET 8', 'Version 20+'), opt('Acme Inc.')]), source: 'Acme Bot v2.1' } },
  { axis: 'Content shape', name: 'Mixed direction: Hebrew and Arabic names in an English card', q: one('Which office should handle this?', [opt('תל אביב (Tel Aviv)'), opt('دبي — Dubai HQ'), opt('London')]) },
  { axis: 'Content shape', name: 'Diacritics and tall scripts', q: one('Thành phố Hồ Chí Minh hay Hà Nội? ÅÉÎÕÜ', [opt('ภาษาไทย ที่นี่ น้ำ'), opt('हिन्दी में क्षेत्र चुनें', 'Devanagari with conjuncts'), opt('Z̤͔ͧ̑̓ä͖̭̈̇lͮ̒ͫǧ̗͚̚o̙̔ͮ̇͐̇', 'Stacked combining marks')]) },
  { axis: 'Content shape', name: 'Numbers: wide figures', q: one('Budget per night?', [opt('$1,111–1,999'), opt('$888,888.88+'), opt('€0.01')]) },

  // ── quantity ──
  { axis: 'Quantity', name: 'One question (1 of 1, no review)', q: one('Include flights?', [opt('Yes'), opt('No')]) },
  { axis: 'Quantity', name: 'One option (too few)', q: one('Confirm the plan?', [opt('Yes, go ahead')]) },
  { axis: 'Quantity', name: 'Nine options with descriptions (the max)', q: one('Which cuisine?', 'Italian Japanese Indian Mexican Thai French Lebanese Greek Korean'.split(' ').map((c) => opt(c, `${c} food, a typical description that wraps onto a second line on narrow cards`))) },
  { axis: 'Quantity', name: 'Twenty options supplied (capped at nine)', q: one('Pick a number', Array.from({ length: 20 }, (_, i) => opt(`Option ${i + 1}`))) },
  { axis: 'Quantity', name: '40 questions, sequential', q: many(40) },
  { axis: 'Quantity', name: '40 questions, all at once', q: many(40, 'all') },

  // ── container ──
  { axis: 'Container', name: '320px container', width: '320px', q: HOTEL },
  { axis: 'Container', name: '320px, all at once', width: '320px', q: { ...HOTEL, flow: 'all' } },
  { axis: 'Container', name: 'Squeezed by a flex sibling (600px fixed sibling in 760px)', squeeze: true, q: HOTEL },
  { axis: 'Container', name: 'Very wide container (1600px)', width: '1600px', q: HOTEL },

  // ── state ──
  { axis: 'State', name: 'Loading (streaming, long first prompt)', width: '375px', setup: (el) => el.open({ id: 's', questions: [{ id: 'a', prompt: SENTENCES, type: 'single', options: [opt('Dual-write'), opt(LONG_WORD)] }] }, { partial: true }) },
  { axis: 'State', name: 'Disabled', attrs: { disabled: '' }, q: HOTEL },
  { axis: 'State', name: 'Undo window after Send (375)', width: '375px', attrs: { review: 'never', 'undo-window': '600000' }, q: one('Include flights?', [opt('Yes'), opt('No')]), setup: (el) => tap(el, '[data-opt="yes"]') },
  { axis: 'State', name: 'Review with long values (320)', width: '320px', attrs: { review: 'always' }, q: { id: 'r', questions: [{ id: 'a', label: `${LONG_WORD} label`, prompt: 'Pick', type: 'single', options: [opt(`${URL}`), opt('No')] }] }, setup: (el) => tap(el, '.opt') },
  { axis: 'State', name: 'Answered record with long answers (320)', width: '320px', q: { id: 'r', flow: 'all', questions: [{ id: 'a', label: LONG_WORD, prompt: 'Pick', type: 'multi', options: [opt(URL), opt(LONG_WORD), opt('Short')] }] }, setup: async (el) => { tap(el, '[data-opt]'); tap(el, '.chip:nth-child(2)'); await wait(50); tap(el, '[data-act="send"]'); } },
  { axis: 'State', name: 'Expired record with a long custom message (320)', width: '320px', q: HOTEL, setup: (el) => el.expire(`The agent moved on after 10 minutes without an answer. ${SENTENCES}`) },
  { axis: 'State', name: 'Replied record (320)', width: '320px', q: HOTEL, setup: async (el) => { tap(el, '[data-opt="covent-garden"]'); await wait(300); el.reply(SENTENCES); } },
  { axis: 'State', name: 'Minimised pill (320)', width: '320px', q: many(40), setup: (el) => el.minimise() },
  { axis: 'State', name: 'Compact density, long content (320)', width: '320px', attrs: { density: 'compact' }, q: one(SENTENCES, [opt(LONG_WORD, URL), opt('Short')]) },
  { axis: 'State', name: 'Dock placement (320)', width: '320px', attrs: { placement: 'dock' }, q: HOTEL },
];

// What the one look found (round 13), shown under each label so the page reads as the report.
const NOTES: Record<number, string> = {
  1: 'Observed: nothing renders. An empty prompt drops the question (the console warns question-dropped). By design, not a layout break.',
  5: 'BROKE: the source dot squashed to a sliver when the source wrapped. FIXED (round 13): it keeps its size, on the first line.',
  10: 'BROKE: built-in English labels on a right-to-left page read "of 1 1" and "Trip planner Asked by". FIXED: label text takes its own direction.',
  11: 'BROKE: same as 10. FIXED: "1 of 1", "Asked by Acme Bot v2.1".',
  13: 'Observed: stacked combining marks spill over the divider, as in any text box. Not fixed (deliberately abusive input).',
  23: 'BROKE: the card collapsed to a sliver (a size container has no minimum width). FIXED: it keeps at least 280px, or its container if narrower.',
  26: 'BROKE: a disabled card looked exactly like an enabled one. FIXED: it dims, with a not-allowed cursor.',
  29: 'BROKE: a long label took the first column; the answer ran one character per line out of the card. FIXED: the label column is capped at 40% and wraps.',
  30: 'BROKE (minor): the clock icon floated mid-paragraph. FIXED: it sits on the first line.',
};

const root = document.getElementById('cases')!;
for (const [i, c] of CASES.entries()) {
  const section = document.createElement('section');
  section.id = `case-${i + 1}`;
  const label = document.createElement('h2');
  label.textContent = `${i + 1}. ${c.axis} · ${c.name}${c.width ? ` · ${c.width}` : ''}`;
  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = NOTES[i + 1] ?? 'Survived.';
  section.append(label, note);
  const el = document.createElement('agent-clarifier') as AgentClarifier;
  for (const [k, v] of Object.entries(c.attrs ?? {})) el.setAttribute(k, v);
  if (c.squeeze) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;inline-size:760px';
    const sib = document.createElement('div');
    sib.style.cssText = 'flex:none;inline-size:600px;outline:1px dashed';
    sib.textContent = 'a 600px sibling';
    row.append(sib, el);
    section.append(row);
  } else {
    const box = document.createElement('div');
    box.style.inlineSize = c.width ?? '720px';
    if (c.lang) box.lang = c.lang;
    box.append(el);
    section.append(box);
  }
  root.append(section);
  if (c.q) el.open(c.q);
  void Promise.resolve(c.setup?.(el));
}
