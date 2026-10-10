// Playground wiring: URL state → controls → the real element. Dev-only, never shipped.
import '../src/index';
import type { AgentClarifier } from '../src/index';
import { SCENARIOS } from './scenarios';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = $<AgentClarifier>('clarifier');
const chat = $('chat');

// ── settings live in the URL, so every case is a link ──────────────────────
// The first option is the default.
const CONTROLS = [
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
  el.open(s.q);
}

// ── the app's side: sending, replying in own words ──────────────────────────
const SEND_EVENTS = ['clarify:submit', 'clarify:revise'];
for (const name of SEND_EVENTS) {
  el.addEventListener(name, (e) => {
    const mode = get('send', 'ok');
    if (mode === 'ok') return;
    e.preventDefault(); // the app takes over: it will call markAnswered() or setError()
    if (mode === 'slow') setTimeout(() => el.markAnswered(), 1500);
    else setTimeout(() => el.setError('The server didn’t respond. Your answers are kept.'), 900);
  });
}

$<HTMLFormElement>('composer').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $<HTMLTextAreaElement>('composer-input');
  const text = input.value.trim();
  if (!text) return;
  bubble('user', text);
  input.value = '';
  // Manual wiring until M3: a message sent while the card is minimised is the answer.
  if (el.state === 'minimised') el.reply(text);
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
