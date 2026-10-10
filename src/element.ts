// <agent-clarifier>: attributes, methods and events around the pure model (BUILD §4, §6).
//
// One loop: a DOM event becomes an action → reducer(state, action, env) → new state →
// render (swap the view if it changed, else update it in place) → fire clarify:* events
// from the transition.

import { Composer, findComposer } from './composer';
import { format, mergeLabels, type LabelKey, type Labels } from './labels';
import { formatWarning, normalize } from './model/normalize';
import { initialState, reducer } from './model/reducer';
import { buildResult, canContinue, draftOf } from './model/selectors';
import type { Action, Env, Flow, Questionnaire, ReviewMode, State, Status } from './model/types';
import { sheet } from './styles';
import { pillView, recordView, loadingView } from './view/endings';
import { reviewView } from './view/review';
import { stepView } from './view/step';
import { unwatchViewport, viewportSheet, watchViewport } from './view/viewport';
import { DELEGATE, OTHER, type Ctx, type View } from './view/types';

/** Lets the module load on a server (Astro, Next): there's no HTMLElement there. */
const Base: typeof HTMLElement =
  // oxlint-disable-next-line typescript/no-extraneous-class
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

/** How long a single pick stays visibly selected before the card moves on (DESIGN §7). */
const CONFIRM_MS = 120;
const TOAST_MS = 5000;

type ViewName = 'none' | 'loading' | 'step' | 'form' | 'review' | 'pill' | 'record';

function viewOf(s: State): ViewName {
  const base = (): ViewName => (s.q?.flow === 'all' ? 'form' : 'step');
  switch (s.status) {
    case 'hidden': return 'none';
    case 'loading': return 'loading';
    case 'minimised': return 'pill';
    case 'answered':
    case 'expired': return 'record';
    case 'reviewing': return 'review';
    case 'answering': return base();
    default: return s.resumeTo === 'answering' ? base() : 'review';
  }
}

export class AgentClarifier extends Base {
  static observedAttributes: string[] = ['placement', 'flow', 'review', 'undo-window', 'disabled', 'composer', 'composer-container'];

  #s: State = initialState();
  #labels: Labels = mergeLabels();
  #root: ShadowRoot;
  #view: View | null = null;
  #viewKey = '';
  #advance = 0;
  #toastTimer = 0;
  #submitTimer = 0;
  #resize: ResizeObserver;
  #composer: Composer | null = null;
  #composerRef: string | Element | null = null;
  #composerContainerRef: string | Element | null = null;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.adoptedStyleSheets = [sheet(), viewportSheet()];
    this.#root.addEventListener('click', (e) => this.#onClick(e));
    this.#root.addEventListener('scroll', () => this.#edges(), true);
    this.#resize = new ResizeObserver(() => this.#edges());
    this.#root.addEventListener('input', (e) => this.#onInput(e));
    this.#root.addEventListener('focusin', (e) => this.#onFocusIn(e));
    this.#root.addEventListener('keydown', (e) => this.#onKeyDown(e as KeyboardEvent));
  }

  connectedCallback(): void {
    watchViewport();
    this.#connectComposer();
    this.#render(true);
  }

  disconnectedCallback(): void {
    unwatchViewport();
    this.#resize.disconnect();
    this.#composer?.destroy();
    this.#composer = null;
  }

  // ── attributes and properties ─────────────────────────────────────────

  attributeChangedCallback(name: string): void {
    if (name === 'composer' || name === 'composer-container') this.#connectComposer();
    if (this.isConnected) this.#render(true);
  }

  /** replace (default): the card takes the composer's place. dock: it sits above it. */
  get placement(): 'replace' | 'dock' {
    return this.getAttribute('placement') === 'dock' ? 'dock' : 'replace';
  }
  set placement(v: 'replace' | 'dock') {
    this.setAttribute('placement', v);
  }

  /** The app's message box: a CSS selector (attribute) or the element itself (property). */
  get composer(): string | Element | null {
    return this.#composerRef ?? this.getAttribute('composer');
  }
  set composer(v: string | Element | null) {
    this.#composerRef = v;
    this.#connectComposer();
    this.#render(true);
  }

  /** What to hide in replace mode. Default: the composer's form, else the composer. */
  get composerContainer(): string | Element | null {
    return this.#composerContainerRef ?? this.getAttribute('composer-container');
  }
  set composerContainer(v: string | Element | null) {
    this.#composerContainerRef = v;
    this.#connectComposer();
    this.#render(true);
  }

  /** The current status, read-only. */
  get state(): Status {
    return this.#s.status;
  }

  /** The full model state, for debugging and the playground. Read-only by convention. */
  get snapshot(): Readonly<State> {
    return this.#s;
  }

  get flow(): Flow {
    return this.getAttribute('flow') === 'all' ? 'all' : 'sequential';
  }
  set flow(v: Flow) {
    this.setAttribute('flow', v);
  }

  get review(): ReviewMode {
    const v = this.getAttribute('review');
    return v === 'always' || v === 'never' ? v : 'auto';
  }
  set review(v: ReviewMode) {
    this.setAttribute('review', v);
  }

  get undoWindow(): number {
    return Math.max(0, Number(this.getAttribute('undo-window')) || 0);
  }
  set undoWindow(v: number) {
    this.setAttribute('undo-window', String(v));
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(v: boolean) {
    this.toggleAttribute('disabled', v);
  }

  get labels(): Labels {
    return this.#labels;
  }
  set labels(v: Partial<Record<LabelKey, unknown>>) {
    this.#labels = mergeLabels(v);
    this.#render(true);
  }

  set questionnaire(q: Questionnaire) {
    this.open(q);
  }

  // ── methods ───────────────────────────────────────────────────────────

  /** Show a questionnaire. Call again with `partial: true` while streaming, then without it. */
  open(q: Questionnaire, opts: { partial?: boolean } = {}): void {
    const partial = !!opts.partial;
    const r = normalize(q);
    for (const w of r.warnings) console.warn(formatWarning(w));
    const streaming = this.#s.status === 'loading' || (this.#s.status === 'minimised' && this.#s.resumeTo === 'loading');
    const type = streaming ? 'STREAM' : 'OPEN';
    if (!r.ok) {
      if (partial) this.#dispatch({ type, q: null, partial });
      else this.#emit('error', { reason: r.reason });
      return;
    }
    // The questionnaire's own flow wins; the attribute is the default.
    const raw = q as { flow?: unknown };
    if (raw.flow !== 'all' && raw.flow !== 'sequential') r.q.flow = this.flow;
    this.#dispatch({ type, q: r.q, partial });
  }

  minimise(): void { this.#dispatch({ type: 'MINIMISE' }); }
  reopen(): void { this.#dispatch({ type: 'REOPEN' }); }
  reset(): void { this.#dispatch({ type: 'RESET' }); }
  /** After a prevented clarify:submit, once the app's send succeeded. */
  markAnswered(): void { this.#dispatch({ type: 'SUBMIT_OK' }); }
  /** After a prevented clarify:submit, if the app's send failed. Answers are kept. */
  setError(message: string): void { this.#dispatch({ type: 'SUBMIT_FAIL', message }); }
  expire(message?: string): void { this.#dispatch(message ? { type: 'EXPIRE', message } : { type: 'EXPIRE' }); }
  /** Manual composer wiring: the user sent a message while the card was minimised. */
  reply(text: string): void { this.#dispatch({ type: 'REPLY', text }); }

  // ── the loop ──────────────────────────────────────────────────────────

  #env(): Env {
    return { review: this.review, undoWindow: this.undoWindow, now: Date.now() };
  }

  #dispatch(action: Action): void {
    const prev = this.#s;
    const next = reducer(prev, action, this.#env());
    if (next === prev) return;
    this.#s = next;
    this.#render();
    this.#effects(prev, next, action);
  }

  #ctx(): Ctx {
    const el = this.closest('[lang]');
    const lang = el?.getAttribute('lang') || document.documentElement.lang || 'en';
    return { s: this.#s, review: this.review, t: (key, vars) => format(this.#labels[key], vars, lang) };
  }

  #render(force = false): void {
    const s = this.#s;
    const name = viewOf(s);
    // Sequential steps are separate views, so each question builds fresh rows.
    const key = `${name}:${name === 'step' ? s.step : ''}:${name === 'record' ? s.record?.kind : ''}`;
    const ctx = this.#ctx();
    if (force || key !== this.#viewKey) {
      this.#viewKey = key;
      this.#view = this.#build(name, ctx);
      this.#root.replaceChildren(...(this.#view ? [this.#view.el] : []));
      this.#resize.disconnect();
      const scroll = this.#root.querySelector('.scroll');
      if (scroll) {
        this.#resize.observe(scroll);
        if (scroll.firstElementChild) this.#resize.observe(scroll.firstElementChild);
      }
    }
    this.#view?.update(ctx);
    if (this.#view) this.#view.el.inert = this.disabled;
    this.#edges();
    this.#syncComposer(ctx);
  }

  // ── the composer ──────────────────────────────────────────────────────

  #connectComposer(): void {
    this.#composer?.destroy();
    this.#composer = null;
    if (!this.isConnected) return;
    const field = findComposer(this, this.composer);
    if (!field) return;
    const container = findComposer(this, this.composerContainer) as HTMLElement | null;
    this.#composer = new Composer(field, container, (text) => this.#replyFromComposer(text));
  }

  /** A message sent from the composer is the answer while the card waits for one (PLAN §4b). */
  #replyFromComposer(text: string): boolean {
    const st = this.#s.status;
    const waiting = st === 'minimised' || (this.placement === 'dock' && (st === 'answering' || st === 'reviewing'));
    if (!waiting) return false;
    this.#dispatch({ type: 'REPLY', text });
    return this.#s.status === 'answered';
  }

  /** Hide/show the composer and swap its placeholder to match the card (BUILD §7). */
  #syncComposer(ctx: Ctx): void {
    const c = this.#composer;
    if (!c) return;
    const st = this.#s.status;
    const open = ['loading', 'answering', 'reviewing', 'submitting', 'error'].includes(st);
    const dock = this.placement === 'dock';
    c.hide(!dock && open);
    c.dock(dock && open);
    // The placeholder says what typing will do, whenever typing is possible and would answer.
    const offersReply = st === 'minimised' || (dock && (st === 'answering' || st === 'reviewing'));
    c.placeholder(offersReply ? ctx.t('composerPlaceholder') : null);
  }

  #focusCard(): void {
    const v = this.#view?.el;
    const target =
      v?.querySelector<HTMLElement>('[aria-checked="true"], [aria-pressed="true"]') ??
      v?.querySelector<HTMLElement>('.opt:not([aria-disabled="true"]), textarea, .btn.primary:not([hidden])');
    target?.focus({ preventScroll: true });
  }

  /** Show an edge shadow only where content is hidden past the edge (DESIGN §3). */
  #edges(): void {
    const card = this.#view?.el;
    const scroll = card?.querySelector('.scroll');
    if (!card || !scroll) return;
    // A header taller than a third of the card scrolls away instead of sticking (round 7).
    const top = card.querySelector<HTMLElement>('.top');
    const max = parseFloat(getComputedStyle(card).maxHeight);
    card.toggleAttribute('data-tall', !!top && max > 0 && top.offsetHeight > max / 3);
    card.toggleAttribute('data-above', scroll.scrollTop > 0);
    card.toggleAttribute('data-below', scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 1);
  }

  #build(name: ViewName, ctx: Ctx): View | null {
    switch (name) {
      case 'none': return null;
      case 'loading': return loadingView(ctx);
      case 'step': return stepView(ctx);
      case 'review': return reviewView(ctx);
      case 'pill': return pillView(ctx);
      case 'record': return recordView(ctx);
      case 'form': return stepView(ctx); // the all-at-once form arrives in M2 step 2
    }
  }

  /** Timers and clarify:* events that follow a transition. Each event fires exactly once. */
  #effects(prev: State, next: State, action: Action): void {
    // Toasts disappear by themselves after a while
    if (next.toast !== prev.toast) {
      clearTimeout(this.#toastTimer);
      if (next.toast) this.#toastTimer = window.setTimeout(() => this.#dispatch({ type: 'TOAST_TIMEOUT' }), TOAST_MS);
    }

    const quiet = ['OPEN', 'STREAM', 'RESET', 'REVISE'].includes(action.type);
    if (next.drafts !== prev.drafts && !quiet && next.q) {
      this.#emit('change', { answers: buildResult(next, 'submitted').answers });
    }

    if (next.status === 'submitting' && prev.status !== 'submitting') this.#scheduleSubmit(next);
    if (next.status !== 'submitting') clearTimeout(this.#submitTimer);

    if (next.record && next.record !== prev.record) {
      const kind = next.record.kind;
      if (kind === 'skipped') this.#emit('skip', next.record.result);
      if (kind === 'replied') this.#emit('reply', next.record.result);
      if (kind === 'expired') this.#emit('expire', next.record.result);
    }
    if (next.status === 'minimised' && prev.status !== 'minimised') {
      this.#emit('dismiss', { resumeTo: next.resumeTo });
      // Minimising gives the composer back, so typing can start straight away (BUILD §5.2).
      if (action.type !== 'COMPOSE') this.#composer?.focus();
    }
    if (action.type === 'REOPEN' || action.type === 'REVISE') {
      if (action.type === 'REOPEN' && prev.compose) this.#composer?.takeBack();
      this.#emit('reopen', null);
      this.#focusCard();
    }
    if (action.type === 'COMPOSE' && next.compose) {
      const detail = { text: next.compose.text, questionId: action.questionId, optionId: action.optionId };
      // Not prevented → we start the sentence ourselves. Prevented → the app inserts it.
      if (this.#emit('compose', detail, true)) this.#composer?.insert(detail.text);
    }
  }

  /** Fire clarify:submit (or clarify:revise) after the undo window. Not prevented → answered. */
  #scheduleSubmit(s: State): void {
    const revising = s.revising;
    const fire = (): void => {
      if (this.#s.status !== 'submitting') return; // undone in the window
      const ok = this.#emit(revising ? 'revise' : 'submit', buildResult(this.#s, 'submitted'), true);
      if (ok) this.#dispatch({ type: 'SUBMIT_OK' });
    };
    clearTimeout(this.#submitTimer);
    if (s.undoUntil) this.#submitTimer = window.setTimeout(fire, Math.max(0, s.undoUntil - Date.now()));
    else queueMicrotask(fire);
  }

  #emit(name: string, detail: unknown, cancelable = false): boolean {
    return this.dispatchEvent(new CustomEvent(`clarify:${name}`, { detail, bubbles: true, composed: true, cancelable }));
  }

  // ── DOM events → actions ──────────────────────────────────────────────

  #current() {
    return this.#s.q?.questions[this.#s.step];
  }

  /** Sequential: after a single pick or "Decide for me", confirm briefly, then move on. */
  #moveOnSoon(): void {
    if (this.#s.q?.flow !== 'sequential') return;
    clearTimeout(this.#advance);
    this.#advance = window.setTimeout(() => this.#dispatch({ type: 'NEXT' }), CONFIRM_MS);
  }

  #onClick(e: Event): void {
    const target = e.target as Element;
    const act = target.closest<HTMLElement>('[data-act]');
    if (act && !(act as HTMLButtonElement).disabled) return this.#onAct(act.dataset.act!, act.dataset.q);

    const row = target.closest<HTMLElement>('[data-opt]');
    const q = this.#current();
    if (!row || !q || row.getAttribute('aria-disabled') === 'true') return;
    const id = row.dataset.opt!;

    if (id === OTHER) {
      this.#dispatch({ type: 'OTHER_FOCUS', questionId: q.id });
      row.querySelector('input')?.focus();
    } else if (id === DELEGATE) {
      this.#dispatch({ type: 'DELEGATE', questionId: q.id });
      if (draftOf(this.#s, q.id).delegated) this.#moveOnSoon();
    } else if (q.type === 'multi') {
      this.#dispatch({ type: 'TOGGLE', questionId: q.id, optionId: id });
    } else if (q.options.find((o) => o.id === id)?.compose != null) {
      this.#dispatch({ type: 'COMPOSE', questionId: q.id, optionId: id });
    } else {
      this.#dispatch({ type: 'SELECT', questionId: q.id, optionId: id });
      this.#moveOnSoon();
    }
  }

  #onAct(act: string, questionId?: string): void {
    const q = this.#current();
    switch (act) {
      case 'back': return this.#dispatch({ type: 'BACK' });
      case 'minimise': return this.#dispatch({ type: 'MINIMISE' });
      case 'reopen': return this.#dispatch({ type: 'REOPEN' });
      case 'undo': return this.#dispatch({ type: 'UNDO' });
      case 'skip': return q ? this.#dispatch({ type: 'SKIP', questionId: q.id }) : undefined;
      case 'next': return this.#dispatch({ type: 'NEXT' });
      case 'send': return this.#dispatch({ type: 'SUBMIT' });
      case 'retry': return this.#dispatch({ type: 'RETRY' });
      case 'start-over': return this.#dispatch({ type: 'START_OVER' });
      case 'revise': return this.#dispatch({ type: 'REVISE' });
      case 'edit': return questionId ? this.#dispatch({ type: 'EDIT', questionId }) : undefined;
    }
  }

  #onInput(e: Event): void {
    const el = e.target as HTMLInputElement | HTMLTextAreaElement;
    const q = this.#current();
    if (!q) return;
    if (el.dataset.input === OTHER) this.#dispatch({ type: 'OTHER_INPUT', questionId: q.id, text: el.value });
    if (el.dataset.input === 'text') this.#dispatch({ type: 'TEXT_INPUT', questionId: q.id, text: el.value });
  }

  #onFocusIn(e: Event): void {
    const el = e.target as HTMLElement;
    const q = this.#current();
    if (q && el.dataset.input === 'text') this.#dispatch({ type: 'TEXT_FOCUS', questionId: q.id });
  }

  #onKeyDown(e: KeyboardEvent): void {
    const el = e.target as HTMLElement;
    if (e.isComposing || !el.dataset.input) return; // full keyboard support arrives in M2 step 3
    const q = this.#current();
    if (e.key === 'Enter' && !e.shiftKey && q && canContinue(q, draftOf(this.#s, q.id))) {
      e.preventDefault();
      this.#dispatch({ type: 'NEXT' });
    }
  }
}
