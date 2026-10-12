// The chat demo (round 25): the real component in a believable chat app, phone first.
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
const PERKS: Record<string, string> = {
  'Walkable to sights': 'Walkable',
  'Quiet at night': 'Quiet at night',
  'Breakfast included': 'Breakfast included',
  'Pool or gym': 'Pool & gym',
};

function hotelReply(r: ClarifyResult): Child[] {
  const area = label(r, 'area') ?? 'Baixa & Chiado';
  const delegated = answer(r, 'budget')?.status === 'delegated';
  const budget = label(r, 'budget') ?? '€120–200';
  const perks = labels(r, 'priorities');
  const notes = label(r, 'notes');
  const hotels = HOTELS[area] ?? HOTELS['Baixa & Chiado']!;
  const prices = PRICES[budget] ?? PRICES['€120–200']!;
  const tags = perks.map((x) => PERKS[x] ?? x);
  return [
    p(`Here are three in `, b(area), budget.startsWith('Under') ? `, under €120 a night` : budget === '€200+' ? `, from €200 a night` : `, €120–200 a night`, tags.length ? `, matched to what you picked:` : ':'),
    h('div', 'cards', ...hotels.map(([name, line], i) =>
      h('div', 'card', h('div', 'top', name, h('span', null, `€${prices[i]}/night`)), h('div', 'sub', [line, ...tags, `${(4.8 - i * 0.1).toFixed(1)} ★`].join(' · '))))),
    delegated && p(h('span', 'note', 'You left the budget to me, so I kept it mid-range.')),
    notes && p(h('span', 'note', `Noted: “${notes}”. I’ll mention it when I book.`)),
    p('Want me to check availability for Friday to Sunday?'),
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
        ? 'You asked, we built it: every report now exports to CSV in one click. Excel, Sheets, your BI tool, all of it.'
        : 'Any report can now go straight to a CSV file, so you can open it in Excel, Google Sheets or your BI tool.';
  return [
    p(`Here’s a draft for `, b(audience.toLowerCase()), `, ${tone.toLowerCase()} in tone:`),
    h('div', 'email',
      h('div', 'subject', subject, h('small', null, 'From: The Product Team')),
      p(hello),
      p(lead),
      extras.includes('Three quick steps') && h('ol', null, h('li', null, 'Open any report'), h('li', null, 'Choose Export, then CSV'), h('li', null, 'Pick the columns and date range')),
      extras.includes('A screenshot') && p(h('span', 'note', '[Screenshot: the Export menu on a report]')),
      extras.includes('A link to the docs') && p('The guide covers scheduled exports too.'),
      h('span', 'cta', cta),
    ),
    p('Want a shorter version for the in-app banner as well?'),
  ];
}

// Support: two quick questions, sent as soon as they're answered (no review step).
function orderReply(r: ClarifyResult): Child[] {
  const order = label(r, 'order') ?? '#48213 · Stoneware mug set';
  const fix = label(r, 'fix') ?? 'Send a replacement';
  const [num, item] = order.includes('·') ? order.split('·').map((s) => s.trim()) : [order, 'your order'];
  const what =
    fix === 'Refund to my card' ? ['Refund issued', 'Back on your card in 3–5 business days']
      : fix.startsWith('Store credit') ? ['Store credit added', 'Credit for the full price plus 10%, ready to use now']
        : ['Replacement on its way', 'Ships today, arrives Thursday or Friday. Tracking by email'];
  return [
    p('Done. ', b(what[0]!), ` for ${num}.`),
    h('div', 'cards', h('div', 'card', h('div', 'top', item!, h('span', null, num!)), h('div', 'sub', what[1]!))),
    p('No need to send the damaged one back. Anything else I can help with?'),
  ];
}

const CONVOS: Convo[] = [
  {
    id: 'hotel',
    area: 'Travel',
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

function scrollDown(): void {
  thread.scrollTop = thread.scrollHeight;
}
// Stay at the newest message when the thread gets shorter (the card opening at the composer, the
// starters coming back, the phone keyboard), if the reader was at the bottom before it shrank.
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
const user = (text: string) => post(h('div', 'msg user', text));
async function assistant(parts: Child[], think = 700): Promise<void> {
  const s = session;
  const dots = post(h('div', 'msg agent typing', h('i'), h('i'), h('i')));
  dots.setAttribute('aria-label', 'Assistant is typing');
  await wait(think);
  dots.remove();
  if (s === session) post(h('div', 'msg agent', ...parts));
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
  el.addEventListener('clarify:reopen', () => {
    starters.hidden = true;
    slot.append(el);
  });
  el.addEventListener('clarify:revise', (e) => {
    queueMicrotask(() => post(el));
    starters.hidden = false;
    void assistant([p('Updated with your new answers.'), ...convo.reply((e as CustomEvent<ClarifyResult>).detail)]);
  });

  // Stream the questions in: each frame adds a question or one more option.
  const full = convo.q;
  const frames: Questionnaire[] = [];
  full.questions.forEach((q, i) => {
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

async function run(convo: Convo, said = convo.ask): Promise<void> {
  const s = session;
  $('hello').hidden = true;
  starters.hidden = true;
  user(said);
  await assistant([p(convo.intro)], 600);
  if (s !== session) return;
  const r = await clarify(convo);
  if (s !== session || r.status === 'dismissed') return;
  if (r.status === 'skipped') {
    await assistant([p('No problem, I’ll go with sensible defaults. You can change anything later.'), ...convo.reply(r)]);
  } else if (r.delivery === 'composer') {
    await assistant([p('Got it, going with what you wrote.'), ...convo.reply(r)]);
  } else {
    await assistant(convo.reply(r), 900);
  }
  if (s === session) showStarters();
}

function showStarters(): void {
  starters.replaceChildren(
    ...CONVOS.map((c) => {
      const chip = h('button', 'chip', h('small', null, c.area), c.ask) as HTMLButtonElement;
      chip.type = 'button';
      chip.addEventListener('click', () => void run(c));
      return chip;
    }),
  );
  starters.hidden = false;
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
  user(text);
  void assistant([p('In this demo I can plan a trip, draft an email or sort out an order. Pick one below, or ask in your own words.')]).then(showStarters);
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
  showStarters();
}
$('new').addEventListener('click', newChat);

// ── light and dark ──────────────────────────────────────────────────────────
const root = document.documentElement;
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const dark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches);
function theme(el: Element): void {
  if (root.dataset.theme) el.setAttribute('theme', root.dataset.theme);
  else el.removeAttribute('theme');
}
function setTheme(t: 'light' | 'dark'): void {
  root.dataset.theme = t;
  document.querySelectorAll('agent-clarifier').forEach(theme);
  $('theme').setAttribute('aria-label', t === 'dark' ? 'Switch to light' : 'Switch to dark');
}
$('theme').addEventListener('click', () => setTheme(dark() ? 'light' : 'dark'));

// ── start ───────────────────────────────────────────────────────────────────
const params = new URLSearchParams(location.search);
const t = params.get('theme');
if (t === 'dark' || t === 'light') setTheme(t);
showStarters();
const first = CONVOS.find((c) => c.id === params.get('start'));
if (first) void run(first);
