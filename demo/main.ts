// Playground wiring: URL state → controls → the real element. Dev-only, never shipped.
import '../src/index';
import type { AgentClarifier, Questionnaire } from '../src/index';
import { SCENARIOS } from './scenarios';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = $<AgentClarifier>('clarifier');
const chat = $('chat');

// ── settings live in the URL, so every case is a link ──────────────────────
// The first option is the default.
const CONTROLS = [
  { key: 'placement', label: 'Placement', options: ['replace', 'dock'] },
  { key: 'theme', label: 'Theme', options: ['auto', 'light', 'dark', 'warm'] },
  { key: 'width', label: 'Chat width', options: ['full', '768', '375'] },
  { key: 'review', label: 'Review step', options: ['auto', 'always', 'never'] },
  { key: 'undo', label: 'Undo window after send', options: ['off', '4s'] },
  { key: 'send', label: 'When the app sends', options: ['ok', 'slow', 'fail'] },
] as const;

type Key = (typeof CONTROLS)[number]['key'] | 'scenario';
const params = new URLSearchParams(location.search);
const get = (k: Key, fallback: string) => params.get(k) ?? fallback;
function set(k: Key, v: string): void {
  params.set(k, v);
  history.replaceState(null, '', `?${params}`);
}

// ── controls ───────────────────────────────────────────────────────────────
function renderControls(): void {
  const box = $('controls');
  box.replaceChildren();
  for (const c of CONTROLS) {
    const current = get(c.key, c.options[0]);
    const group = document.createElement('div');
    group.className = 'control';
    group.innerHTML = `<h2>${c.label}</h2>`;
    const seg = document.createElement('div');
    seg.className = 'seg';
    for (const o of c.options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o;
      b.setAttribute('aria-pressed', String(o === current));
      b.addEventListener('click', () => {
        set(c.key, o);
        renderControls();
        applySettings();
      });
      seg.append(b);
    }
    group.append(seg);
    box.append(group);
  }
}

function applySettings(): void {
  const theme = get('theme', 'auto');
  el.classList.toggle('warm', theme === 'warm');
  if (theme === 'light' || theme === 'dark') el.setAttribute('theme', theme);
  else if (theme === 'warm') el.setAttribute('theme', 'light');
  else el.removeAttribute('theme');
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : theme === 'auto' ? '' : 'light';

  const width = get('width', 'full');
  chat.style.maxInlineSize = width === 'full' ? '' : `${width}px`;
  chat.classList.toggle('framed', width !== 'full');

  el.placement = get('placement', 'replace') as 'replace' | 'dock';
  el.review = get('review', 'auto') as 'auto' | 'always' | 'never';
  el.undoWindow = get('undo', 'off') === '4s' ? 4000 : 0;
}

// ── scenarios ──────────────────────────────────────────────────────────────
function renderScenarios(): void {
  const current = get('scenario', 'hotel');
  const box = $('scenarios');
  box.replaceChildren();
  for (const s of SCENARIOS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(s.id === current));
    b.disabled = !!s.soon;
    b.innerHTML = s.soon ? `${s.name} <small>${s.soon}</small>` : s.name;
    b.addEventListener('click', () => {
      set('scenario', s.id);
      renderScenarios();
      start();
    });
    box.append(b);
  }
}

function bubble(who: 'user' | 'agent', text: string): void {
  const m = document.createElement('div');
  m.className = `msg ${who}`;
  m.textContent = text;
  $('msgs').append(m);
  $('msgs').scrollTop = $('msgs').scrollHeight;
}

function start(): void {
  const s = SCENARIOS.find((x) => x.id === get('scenario', 'hotel')) ?? SCENARIOS[0]!;
  $('note').textContent = s.note;
  chat.lang = s.lang ?? 'en';
  chat.dir = s.lang?.startsWith('ar') ? 'rtl' : 'ltr';
  $('msgs').replaceChildren();
  bubble('user', s.user);
  bubble('agent', s.agent);
  $('result').textContent = '—';
  el.reset();
  el.labels = s.labels ?? {};
  toComposer();
  clearInterval(streaming);
  if (s.stream) stream(s.q);
  else el.open(s.q);
}

// Streaming: each frame adds one more piece (a prompt, then its options one by one).
let streaming = 0;
function stream(full: Questionnaire): void {
  const frames: Questionnaire[] = [];
  full.questions.forEach((q, i) => {
    const before = full.questions.slice(0, i);
    for (let n = 0; n <= (q.options?.length ?? 0); n++) {
      frames.push({ ...full, questions: [...before, { ...q, options: q.options?.slice(0, n) }] });
    }
  });
  el.open({ ...full, questions: [] }, { partial: true });
  let k = 0;
  streaming = window.setInterval(() => {
    if (k < frames.length) el.open(frames[k++]!, { partial: true });
    else {
      clearInterval(streaming);
      el.open(full);
    }
  }, 300);
}

// ── where the element lives ─────────────────────────────────────────────────
// While asking, it sits at the composer. Once it becomes a record, the app moves it into the
// transcript, so the record stays with the conversation (and back again if it's reopened).
function toTranscript(): void {
  if (['answered', 'expired'].includes(el.state) && el.parentElement !== $('msgs')) {
    $('msgs').append(el);
    $('msgs').scrollTop = $('msgs').scrollHeight;
  }
}
function toComposer(): void {
  if (el.parentElement !== $('dock')) $('dock').prepend(el);
}
for (const name of ['clarify:skip', 'clarify:expire']) el.addEventListener(name, toTranscript);
// A reply sent from the composer was taken as the answer, so the app shows it as the user's own
// message (it never reached the app's normal send), with the record under it.
el.addEventListener('clarify:reply', (e) => {
  bubble('user', (e as CustomEvent<{ message: string }>).detail.message);
  toTranscript();
});
el.addEventListener('clarify:submit', () => queueMicrotask(toTranscript));
el.addEventListener('clarify:revise', () => queueMicrotask(toTranscript));
el.addEventListener('clarify:reopen', toComposer);

// ── the app's side: sending, replying in own words ──────────────────────────
const SEND_EVENTS = ['clarify:submit', 'clarify:revise'];
for (const name of SEND_EVENTS) {
  el.addEventListener(name, (e) => {
    const mode = get('send', 'ok');
    if (mode === 'ok') return;
    e.preventDefault(); // the app takes over: it will call markAnswered() or setError()
    if (mode === 'slow') setTimeout(() => (el.markAnswered(), toTranscript()), 1500);
    else setTimeout(() => el.setError('The server didn’t respond. Your answers are kept.'), 900);
  });
}

// The app's normal send. While the card waits for an answer, the element catches the submit first
// (capture phase) and delivers it as clarify:reply instead, so this only runs for ordinary messages.
$<HTMLFormElement>('composer').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $<HTMLTextAreaElement>('composer-input');
  const text = input.value.trim();
  if (!text) return;
  bubble('user', text);
  input.value = '';
});
$<HTMLTextAreaElement>('composer-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    $<HTMLFormElement>('composer').requestSubmit();
  }
});

// ── readouts: events, result, state ─────────────────────────────────────────
const EVENTS = ['change', 'submit', 'revise', 'skip', 'reply', 'compose', 'dismiss', 'reopen', 'expire', 'error'];
for (const name of EVENTS) {
  el.addEventListener(`clarify:${name}`, (e) => {
    const detail = (e as CustomEvent).detail;
    const li = document.createElement('li');
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const json = JSON.stringify(detail);
    li.innerHTML = `<b>clarify:${name}</b> <time>${time}</time><code></code>`;
    li.querySelector('code')!.textContent = json === undefined || json === 'null' ? '' : json.length > 140 ? `${json.slice(0, 140)}…` : json;
    li.title = JSON.stringify(detail, null, 2) ?? '';
    $('log').prepend(li);
    if (['submit', 'revise', 'skip', 'reply', 'expire'].includes(name)) {
      $('result').textContent = JSON.stringify(detail, null, 2);
    }
  });
}
$('clear').addEventListener('click', () => $('log').replaceChildren());
$('restart').addEventListener('click', start);

let lastState = '';
setInterval(() => {
  const s = el.snapshot;
  const drafts = Object.fromEntries(
    Object.entries(s.drafts).map(([id, d]) => [
      id,
      d.delegated ? 'delegated' : d.skipped ? 'skipped' : [...d.values, d.otherActive ? `“${d.other}”` : '', d.text ? `“${d.text}”` : ''].filter(Boolean).join(', ') || '—',
    ]),
  );
  const view = { status: s.status, step: s.step, resumeTo: s.resumeTo, returnTo: s.returnTo, toast: s.toast?.kind ?? null, undoSteps: s.history.length, drafts };
  const text = JSON.stringify(view, null, 2);
  if (text !== lastState) $('state').textContent = lastState = text;
}, 200);

Object.assign(window, { clarifier: el });
renderControls();
renderScenarios();
applySettings();
start();
