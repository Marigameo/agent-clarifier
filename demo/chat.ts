// The chat demo (rounds 25–26): the real component in a believable chat app, phone first.
// A scripted assistant: it asks with <agent-clarifier>, then replies with something built from the
// answers. URL: ?start=hotel|email|order opens a conversation, ?theme=dark|light sets the theme.
import '../src/index';
import type { AgentClarifier, Answer, ClarifyResult, Questionnaire } from '../src/index';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const thread = $('thread');
const slot = $('slot');
const box = $<HTMLTextAreaElement>('box');
const form = $<HTMLFormElement>('composer');
const starters = $('starters');

// ── a tiny DOM builder (text only, never HTML) ──────────────────────────────
type Child = Node | string | null | false | undefined;
function h(tag: string, cls?: string | null, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  for (const c of children) if (c) el.append(c);
  return el;
}
const p = (...c: Child[]) => h('p', null, ...c);
const b = (text: string) => h('b', null, text);

// ── the three conversations ─────────────────────────────────────────────────
interface Convo {
  id: string;
  area: string; // the starter's small label
  short: string; // its name in the "Try another" line
  ask: string; // what the user types
  match: RegExp; // typed messages that start this conversation
  intro: string; // the assistant's line before it asks
  review?: 'never';
  q: Questionnaire;
  reply: (r: ClarifyResult) => Child[];
}

const answer = (r: ClarifyResult, id: string): Answer | undefined => r.answers[id];
const label = (r: ClarifyResult, id: string): string | undefined => {
  const a = answer(r, id);
  return a?.status === 'answered' ? a.labels[0] : undefined;
};
const labels = (r: ClarifyResult, id: string): string[] => {
  const a = answer(r, id);
  return a?.status === 'answered' ? a.labels : [];
};

// Travel: one question at a time, a recommended pick, Decide for me, a capped multi, a note.
const HOTELS: Record<string, [string, string][]> = {
  'Baixa & Chiado': [['Hotel Elevador', 'Steps from the Santa Justa lift'], ['Chiado Terrace Rooms', 'Rooftop bar, river views'], ['Rua Augusta Suites', 'On the main pedestrian street']],
  Alfama: [['Casa do Miradouro', 'Above the Santa Luzia viewpoint'], ['Pátio das Laranjeiras', 'Courtyard rooms, orange trees'], ['Casa Fado', 'Fado houses on the doorstep']],
  'Príncipe Real': [['Jardim Residences', 'Facing the garden square'], ['Casa Botânica', 'Next to the botanical garden'], ['The Quiet Square', 'Small, boutique, 12 rooms']],
};
const PRICES: Record<string, number[]> = { 'Under €120': [98, 109, 118], '€120–200': [145, 168, 189], '€200+': [235, 260, 310] };
const RANGE: Record<string, string> = { 'Under €120': 'under €120 a night', '€120–200': '€120–200 a night', '€200+': 'from €200 a night' };
// What the user's priorities mean for every hotel shown, said once in the lead (round 26: not on each card).
const PERKS: Record<string, string> = {
  'Walkable to sights': 'walkable',
  'Quiet at night': 'quiet at night',
  'Breakfast included': 'with breakfast',
  'Pool or gym': 'with a pool or gym',
};
const and = (items: string[]): string => new Intl.ListFormat('en', { type: 'conjunction' }).format(items);
const rows = (items: [string, string, string][]) =>
  h('div', 'list', ...items.map(([name, right, sub]) => h('div', 'row', h('div', 'top', name, h('span', null, right)), h('div', 'sub', sub))));

function hotelReply(r: ClarifyResult): Child[] {
  const area = label(r, 'area') ?? 'Baixa & Chiado';
  const delegated = answer(r, 'budget')?.status === 'delegated';
  const budget = label(r, 'budget') ?? '€120–200';
  const perks = labels(r, 'priorities').map((x) => PERKS[x]).filter((x): x is string => !!x);
  const notes = label(r, 'notes');
  const hotels = HOTELS[area] ?? HOTELS['Baixa & Chiado']!;
  const prices = PRICES[budget] ?? PRICES['€120–200']!;
  return [
    delegated
      ? p('Three in ', b(area), `. You left the budget to me, so I kept to ${RANGE[budget] ?? RANGE['€120–200']}.`, perks.length ? ` All ${and(perks)}.` : '')
      : p('Three in ', b(area), `, ${RANGE[budget] ?? RANGE['€120–200']}.`, perks.length ? ` All ${and(perks)}.` : ''),
    rows(hotels.map(([name, line], i) => [name, `€${prices[i]}`, `${line} · ★ ${(4.8 - i * 0.1).toFixed(1)}`])),
    notes && p(`I’ll tell the hotel: “${notes}”.`),
    p('Want me to check which are free Friday to Sunday?'),
  ];
}

// Writing: everything at once, and a "write my own" option that starts a sentence in the composer.
function emailReply(r: ClarifyResult): Child[] {
  const audience = label(r, 'audience') ?? 'All customers';
  const tone = label(r, 'tone') ?? 'Friendly';
  const extras = labels(r, 'include');
  // "Write my own" sends the user's sentence as a message: it becomes the button.
  const own = r.delivery === 'composer' ? r.message?.replace(/^End with:\s*/i, '').trim() : undefined;
  const cta = own || label(r, 'cta') || 'Try it now';
  const subject = tone === 'Formal' ? 'CSV export is now available' : tone === 'Excited' ? 'It’s here: export any report to CSV' : 'New: export any report to CSV';
  const hello = audience === 'Admins only' ? 'Hi admins,' : audience === 'Trial users' ? 'Hi there, and thanks for trying us out,' : 'Hi there,';
  const lead =
    tone === 'Formal'
      ? 'You can now export any report to CSV, ready for Excel, Google Sheets or your BI tool.'
      : tone === 'Excited'
        ? 'Every report now exports to CSV in one click. Open it in Excel, Google Sheets or your BI tool.'
        : 'Any report can now go straight to a CSV file, so you can open it in Excel, Google Sheets or your BI tool.';
  return [
    p('Here’s a draft for ', b(audience.toLowerCase()), `, ${tone.toLowerCase()} in tone:`),
    h('div', 'email',
      h('div', 'subject', subject),
      p(hello),
      p(lead),
      extras.includes('Three quick steps') && h('ol', null, h('li', null, 'Open any report'), h('li', null, 'Choose Export, then CSV'), h('li', null, 'Pick the columns and date range')),
      extras.includes('A screenshot') && p(h('span', 'aside', '[Screenshot: the Export menu on a report]')),
      extras.includes('A link to the docs') && p('The full guide covers scheduled exports: help.example.com/csv-export'),
      h('span', 'cta', cta),
    ),
    p('Want a shorter version for the in-app banner as well?'),
  ];
}

// Support: two quick questions, sent as soon as they're answered (no review step).
function orderReply(r: ClarifyResult): Child[] {
  const order = label(r, 'order') ?? '#48213 · Stoneware mug set';
  const fix = label(r, 'fix') ?? 'Send a replacement';
  const [num, item] = order.includes('·') ? order.split('·').map((s) => s.trim()) : [order, 'Your order'];
  const [done, sub] =
    fix === 'Refund to my card' ? [['Refund issued', ' to your card.'], 'Back on your card in 3–5 business days.']
      : fix.startsWith('Store credit') ? [['Store credit added', ': the full price plus 10%.'], 'Ready to use on your next order.']
        : [['A replacement', ' ships today.'], 'Arrives Thursday or Friday. Tracking link by email.'];
  return [
    p('Done. ', b(done[0]!), done[1]!),
    rows([[item!, num!, sub as string]]),
    p('No need to send the damaged one back.'),
  ];
}

const CONVOS: Convo[] = [
  {
    id: 'hotel',
    area: 'Travel',
    short: 'a hotel in Lisbon',
    ask: 'Find me a hotel in Lisbon for next weekend',
    match: /hotel|stay|trip|travel|lisbon|weekend/i,
    intro: 'Happy to. A few quick questions first, so I only show places you’d actually book.',
    q: {
      id: 'lisbon-hotel',
      questions: [
        {
          id: 'area', label: 'Area', prompt: 'Which part of Lisbon?', type: 'single',
          options: [
            { id: 'baixa', label: 'Baixa & Chiado', description: 'Central and flat, near shops and trams', recommended: true },
            { id: 'alfama', label: 'Alfama', description: 'Old town, viewpoints, steep streets' },
            { id: 'principe', label: 'Príncipe Real', description: 'Quiet and leafy, good restaurants' },
          ],
        },
        {
          id: 'budget', label: 'Budget', prompt: 'Budget per night?', description: 'Before taxes, for one room.', type: 'single', delegate: true,
          options: [{ id: 'low', label: 'Under €120' }, { id: 'mid', label: '€120–200' }, { id: 'high', label: '€200+' }],
        },
        {
          id: 'priorities', label: 'Priorities', prompt: 'What matters most?', description: 'Pick up to 2.', type: 'multi', max: 2,
          options: [{ id: 'walk', label: 'Walkable to sights' }, { id: 'quiet', label: 'Quiet at night' }, { id: 'breakfast', label: 'Breakfast included' }, { id: 'pool', label: 'Pool or gym' }],
        },
        { id: 'notes', label: 'Notes', prompt: 'Anything else I should know?', description: 'Optional. A late arrival, accessibility needs, a birthday…', type: 'text' },
      ],
    },
    reply: hotelReply,
  },
  {
    id: 'email',
    area: 'Writing',
    short: 'a launch email',
    ask: 'Write a launch email for our new CSV export',
    match: /email|launch|announce|newsletter|write/i,
    intro: 'Sure. Tell me who it’s for and how it should sound, and I’ll draft it.',
    q: {
      id: 'launch-email',
      title: 'A few details for the email',
      flow: 'all',
      questions: [
        {
          id: 'audience', label: 'Audience', prompt: 'Who is it for?', type: 'single', required: true,
          options: [{ id: 'all', label: 'All customers', recommended: true }, { id: 'admins', label: 'Admins only' }, { id: 'trial', label: 'Trial users' }],
        },
        {
          id: 'tone', label: 'Tone', prompt: 'How should it sound?', type: 'single',
          options: [{ id: 'friendly', label: 'Friendly', recommended: true }, { id: 'formal', label: 'Formal' }, { id: 'excited', label: 'Excited' }],
        },
        {
          id: 'include', label: 'Include', prompt: 'What should it include?', type: 'multi', other: false,
          options: [{ id: 'steps', label: 'Three quick steps' }, { id: 'shot', label: 'A screenshot' }, { id: 'docs', label: 'A link to the docs' }],
        },
        {
          id: 'cta', label: 'Button', prompt: 'What should the button say?', type: 'single',
          options: [{ id: 'try', label: 'Try it now' }, { id: 'guide', label: 'Read the guide' }, { id: 'own', label: 'Write my own', compose: 'End with: ' }],
        },
      ],
    },
    reply: emailReply,
  },
  {
    id: 'order',
    area: 'Support',
    short: 'a damaged order',
    ask: 'My order arrived damaged',
    match: /order|damaged|broken|refund|return|replace|arrived/i,
    intro: 'Sorry about that. Two quick questions and I’ll sort it out.',
    review: 'never',
    q: {
      id: 'damaged-order',
      questions: [
        {
          id: 'order', label: 'Order', prompt: 'Which order is it?', type: 'single', required: true,
          options: [
            { id: '48213', label: '#48213 · Stoneware mug set', description: 'Delivered Tuesday', recommended: true },
            { id: '47950', label: '#47950 · Linen napkins', description: 'Delivered 3 Oct' },
          ],
          other: { label: 'A different order', placeholder: 'Order number' },
        },
        {
          id: 'fix', label: 'Fix', prompt: 'What would you like us to do?', type: 'single', other: false,
          options: [
            { id: 'replace', label: 'Send a replacement', description: 'Ships today, arrives Thursday or Friday', recommended: true },
            { id: 'refund', label: 'Refund to my card', description: 'Back in 3–5 business days' },
            { id: 'credit', label: 'Store credit + 10%', description: 'Ready to use right away' },
          ],
        },
      ],
    },
    reply: orderReply,
  },
];

// ── the conversation ────────────────────────────────────────────────────────
let session = 0; // a new chat cancels whatever the old one was waiting for
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
// One stable status says what's new, once (round 26). The thread itself isn't a live region: that
// read out your own message, the whole record and the card's own "Answers sent." on top of the reply.
const said = $('said');

function scrollDown(): void {
  thread.scrollTop = thread.scrollHeight;
}
// Stay at the newest message when the thread gets shorter (the card opening at the composer, the
// phone keyboard), if the reader was at the bottom before it shrank.
// Judged from the size change, not scroll events: those can arrive after the shrink.
let threadHeight = thread.clientHeight;
new ResizeObserver(() => {
  const shrunk = threadHeight - thread.clientHeight;
  threadHeight = thread.clientHeight;
  if (shrunk > 0 && thread.scrollHeight - thread.scrollTop - thread.clientHeight - shrunk < 48) scrollDown();
}).observe(thread);
function post(node: HTMLElement): HTMLElement {
  thread.append(node);
  scrollDown();
  return node;
}
// Who said it, for screen readers and forced colours, where position and fill don't come through.
const user = (text: string) => post(h('div', 'msg user', h('span', 'sr-only', 'You: '), text));
async function assistant(parts: Child[], think = 700): Promise<void> {
  const s = session;
  const dots = post(h('div', 'msg agent typing', h('i'), h('i'), h('i')));
  dots.setAttribute('aria-hidden', 'true');
  said.textContent = 'Assistant is typing…';
  await wait(think);
  dots.remove();
  if (s !== session) return;
  said.textContent = post(h('div', 'msg agent', h('span', 'sr-only', 'Assistant: '), ...parts)).textContent ?? '';
}

/** The three starters, as buttons: in the empty state, and in the reply to anything else. */
function chips(): HTMLElement[] {
  return CONVOS.map((c) => {
    const chip = h('button', 'chip', h('small', null, c.area), c.ask) as HTMLButtonElement;
    chip.type = 'button';
    chip.addEventListener('click', () => void run(c));
    return chip;
  });
}
/** After a reply: one quiet line with the other two, instead of the starter cards again (round 26). */
function offerMore(done: Convo): void {
  const [a, b2] = CONVOS.filter((c) => c !== done).map((c) => {
    const btn = h('button', null, c.short) as HTMLButtonElement;
    btn.type = 'button';
    btn.addEventListener('click', () => void run(c));
    return btn;
  });
  post(h('div', 'more', 'Try another:', a, 'or', b2));
}

/**
 * Ask with the card, the way an app would: it opens where the composer is (taking its place), the
 * questions stream in, and once answered the card stays in the conversation as a record.
 * ask() from the package does the same in one call; this version also shows the streaming state.
 */
function clarify(convo: Convo): Promise<ClarifyResult> {
  const el = document.createElement('agent-clarifier') as AgentClarifier;
  el.setAttribute('composer', '#box');
  if (convo.review) el.review = convo.review;
  theme(el);
  slot.append(el);

  // "Edit answers" on a record brings it back to the composer; sending again posts a new reply.
  el.addEventListener('clarify:reopen', () => slot.append(el));
  el.addEventListener('clarify:revise', (e) => {
    queueMicrotask(() => post(el));
    void assistant([p('Updated with your new answers.'), ...convo.reply((e as CustomEvent<ClarifyResult>).detail)]);
  });

  // Stream the questions in: each frame adds one more option. One at a time shows a single question,
  // so only that one streams and the rest arrive at once: no second of skeleton rows (round 26).
  const full = convo.q;
  const frames: Questionnaire[] = [];
  full.questions.forEach((q, i) => {
    if (i > 0 && full.flow !== 'all') return;
    const sizes = q.options ? q.options.map((_, n) => n + 1) : [0];
    for (const n of sizes) frames.push({ ...full, questions: [...full.questions.slice(0, i), { ...q, options: q.options?.slice(0, n) }] });
  });
  el.open({ ...full, questions: [] }, { partial: true });
  let k = 0;
  const timer = setInterval(() => {
    if (k < frames.length) el.open(frames[k++]!, { partial: true });
    else {
      clearInterval(timer);
      el.open(full);
    }
  }, 110);

  return new Promise((resolve) => {
    const done = (e: Event): void => {
      for (const n of DONE) el.removeEventListener(n, done);
      clearInterval(timer);
      const r = (e as CustomEvent<ClarifyResult>).detail;
      // A reply in the user's own words never reached the app's send, so show it as their message.
      if (e.type === 'clarify:reply') user(r.message ?? '');
      // Into the conversation once it's a record (after the card has handed focus back).
      queueMicrotask(() => post(el));
      resolve(r);
    };
    for (const n of DONE) el.addEventListener(n, done);
  });
}
const DONE = ['clarify:submit', 'clarify:skip', 'clarify:reply', 'clarify:expire'];

async function run(convo: Convo, text = convo.ask): Promise<void> {
  const s = session;
  // The button that started it is about to go: keep focus in the conversation, not on <body>
  // (and not in the composer, which would pop the phone keyboard up).
  if (document.activeElement?.closest('.starters, .more, .msg')) thread.focus({ preventScroll: true });
  $('hello').hidden = true;
  for (const m of thread.querySelectorAll('.more')) m.remove();
  user(text);
  await assistant([p(convo.intro)], 600);
  if (s !== session) return;
  const r = await clarify(convo);
  if (s !== session || r.status === 'dismissed') return;
  if (r.status === 'skipped') {
    await assistant([p('No problem, I’ll pick for you. You can change anything later.'), ...convo.reply(r)]);
  } else if (r.delivery === 'composer') {
    await assistant([p('Got it, going with what you wrote.'), ...convo.reply(r)]);
  } else {
    await assistant(convo.reply(r), 900);
  }
  if (s === session) offerMore(convo);
}

// The app's normal send. While a card waits for an answer it catches the submit first (capture
// phase) and takes the message as the answer, so this only runs for ordinary messages.
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = box.value.trim();
  if (!text) return;
  box.value = '';
  const convo = CONVOS.find((c) => c.match.test(text));
  if (convo) return void run(convo, text);
  $('hello').hidden = true;
  for (const m of thread.querySelectorAll('.more')) m.remove();
  user(text);
  void assistant([
    p('I can’t do that in this demo. I can find a hotel, write a launch email or sort out a damaged order. Pick one:'),
    h('div', 'starters', ...chips()),
  ]);
});
box.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    form.requestSubmit();
  }
});

function newChat(): void {
  session++;
  for (const el of document.querySelectorAll('agent-clarifier')) {
    el.expire();
    el.remove();
  }
  thread.replaceChildren($('hello'));
  $('hello').hidden = false;
  said.textContent = '';
}
$('new').addEventListener('click', newChat);

// ── light and dark ──────────────────────────────────────────────────────────
const root = document.documentElement;
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const dark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches);
// The button names what it will do, from the theme actually showing (a dark OS starts dark).
const nameToggle = () => $('theme').setAttribute('aria-label', dark() ? 'Switch to light' : 'Switch to dark');
function theme(el: Element): void {
  if (root.dataset.theme) el.setAttribute('theme', root.dataset.theme);
  else el.removeAttribute('theme');
}
function setTheme(t: 'light' | 'dark'): void {
  root.dataset.theme = t;
  document.querySelectorAll('agent-clarifier').forEach(theme);
  nameToggle();
}
$('theme').addEventListener('click', () => setTheme(dark() ? 'light' : 'dark'));
systemDark.addEventListener('change', nameToggle);

// ── start ───────────────────────────────────────────────────────────────────
const params = new URLSearchParams(location.search);
const t = params.get('theme');
if (t === 'dark' || t === 'light') setTheme(t);
nameToggle();
starters.replaceChildren(...chips());
const first = CONVOS.find((c) => c.id === params.get('start'));
if (first) void run(first);
