// <agent-clarifier>: attributes, methods and events around the pure model (BUILD §4, §6).
//
// One loop: a DOM event becomes an action → reducer(state, action, env) → new state →
// render (swap the view if it changed, else update it in place) → fire clarify:* events
// from the transition.

import { Composer, findComposer } from './composer';
import { format, formatList, formatNumber, mergeLabels, type LabelKey, type Labels } from './labels';
import { formatWarning, normalize } from './model/normalize';
import { initialState, reducer } from './model/reducer';
import { buildResult, canContinue, draftOf } from './model/selectors';
import type { Action, Env, Flow, Questionnaire, ReviewMode, State, Status } from './model/types';
import { sheet } from './styles';
import { pillView, recordView, loadingView } from './view/endings';
import { formView } from './view/form';
import { reviewView } from './view/review';
import { stepView } from './view/step';
import { usingPointer } from './view/modality';
import { enter, leave, type Move } from './view/motion';
import { unwatchViewport, viewportSheet, watchViewport } from './view/viewport';
import { h, rove } from './view/dom';
import { DELEGATE, OTHER, type Ctx, type View } from './view/types';
import * as Act from './model/act';

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
  #viewName: ViewName = 'none';
  #shownStep = 0;
  /** Move focus into the card at the next view that can take it (replace mode open, reopen). */
  #wantFocus = false;
  /** The step change came from the Back button: keep focus on Back, so repeated presses keep going back. */
  #focusBack = false;
  /** Polite live region (BUILD §5.4). Lives outside the views, so it survives view swaps. */
  #live: HTMLElement;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.adoptedStyleSheets = [sheet(), viewportSheet()];
    this.#root.addEventListener('click', (e) => this.#onClick(e));
    this.#root.addEventListener('scroll', () => this.#edges(), true);
    this.#resize = new ResizeObserver(() => this.#edges());
    this.#live = h('div', { class: 'live', role: 'status', 'aria-live': 'polite' });
    this.#root.append(this.#live);
    this.#root.addEventListener('input', (e) => this.#onInput(e));
    this.#root.addEventListener('focusin', (e) => this.#onFocusIn(e));
    this.#root.addEventListener('keydown', (e) => this.#onKeyDown(e as KeyboardEvent));
    // Focus still moves for pointer users (so the keyboard can take over at any moment), but its
    // ring only shows for keyboard users: after a click it's noise. (The page-level tracker has
    // already updated by the time these run, since it listens at the document in capture phase.)
    this.#root.addEventListener('pointerdown', () => this.#modality(), true);
    this.#root.addEventListener('keydown', () => this.#modality(), true);
  }

  connectedCallback(): void {
    usingPointer(); // start tracking how the user interacts, before the first card opens
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
    // While streaming, half-written questions are expected, so only warn about the final version.
    if (!partial) for (const w of r.warnings) console.warn(formatWarning(w));
    const streaming = this.#s.status === 'loading' || (this.#s.status === 'minimised' && this.#s.resumeTo === 'loading');
    const type = streaming ? Act.STREAM : Act.OPEN;
    if (!r.ok) {
      if (partial) {
        if (type === Act.OPEN && this.placement === 'replace') this.#wantFocus = true;
        this.#dispatch({ type, q: null, partial });
      }
      else this.#emit('error', { reason: r.reason });
      return;
    }
    // The questionnaire's own flow wins; the attribute is the default.
    const raw = q as { flow?: unknown };
    if (raw.flow !== 'all' && raw.flow !== 'sequential') r.q.flow = this.flow;
    if (type === Act.OPEN && this.placement === 'replace') this.#wantFocus = true;
    this.#dispatch({ type, q: r.q, partial });
  }

  minimise(): void { this.#dispatch({ type: Act.MINIMISE }); }
  reopen(): void { this.#dispatch({ type: Act.REOPEN }); }
  reset(): void { this.#dispatch({ type: Act.RESET }); }
  /** After a prevented clarify:submit, once the app's send succeeded. */
  markAnswered(): void { this.#dispatch({ type: Act.SUBMIT_OK }); }
  /** After a prevented clarify:submit, if the app's send failed. Answers are kept. */
  setError(message: string): void { this.#dispatch({ type: Act.SUBMIT_FAIL, message }); }
  expire(message?: string): void { this.#dispatch(message ? { type: Act.EXPIRE, message } : { type: Act.EXPIRE }); }
  /** Manual composer wiring: the user sent a message while the card was minimised. */
  reply(text: string): void { this.#dispatch({ type: Act.REPLY, text }); }

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
    return {
      s: this.#s,
      review: this.review,
      t: (key, vars) => format(this.#labels[key], vars, lang),
      list: (items) => formatList(items, lang),
      num: (n) => formatNumber(n, lang),
    };
  }

  #render(force = false): void {
    const s = this.#s;
    const name = viewOf(s);
    // Sequential steps are separate views, so each question builds fresh rows.
    const key = `${name}:${name === 'step' ? s.step : ''}:${name === 'record' ? s.record?.kind : ''}`;
    const ctx = this.#ctx();
    const swap = force || key !== this.#viewKey;
    // Was focus inside the card? Then it must follow into the new view, never fall to <body>.
    const hadFocus = !!this.#root.activeElement && this.#root.activeElement !== this.#live;
    const fromName = this.#viewName;
    const fromStep = this.#shownStep;
    const fromHeight = swap ? (this.#view?.el.getBoundingClientRect().height ?? 0) : 0;
    if (swap) {
      this.#viewKey = key;
      this.#viewName = name;
      this.#shownStep = s.step;
      this.#view = this.#build(name, ctx);
      this.#root.replaceChildren(...(this.#view ? [this.#view.el] : []), this.#live);
      this.#resize.disconnect();
      const scroll = this.#root.querySelector('.scroll');
      if (scroll) {
        this.#resize.observe(scroll);
        if (scroll.firstElementChild) this.#resize.observe(scroll.firstElementChild);
      }
    }
    this.#view?.update(ctx);
    if (this.#view) {
      this.#view.el.inert = this.disabled;
      this.#view.el.toggleAttribute('data-pointer', usingPointer());
    }
    this.#edges();
    this.#syncComposer(ctx);
    if (swap && this.#view && !force) enter(this.#view.el, fromHeight, this.#move(fromName, fromStep, name), getComputedStyle(this).direction === 'rtl');
    if (swap && (hadFocus || this.#wantFocus)) this.#focusView(hadFocus);
  }

  /** Which way the content moves: forward through the steps, back, or just a swap. */
  #move(from: ViewName, fromStep: number, to: ViewName): Move {
    if (from === 'none') return 'open';
    if (from === 'step' && to === 'step') return this.#s.step < fromStep ? 'back' : 'forward';
    if (from === 'step' && to === 'review') return 'forward';
    if (from === 'review' && to === 'step') return 'back';
    // Folding into the pill or the record, or opening back out of the pill.
    if (to === 'pill' || to === 'record' || from === 'pill') return 'fold';
    return 'swap';
  }

  /**
   * Put focus somewhere sensible in the current view (BUILD §5.2): the picked, recommended or
   * first option; the Send button on review; the composer once the card is done. Never a text
   * field on touch screens, where that would pop the keyboard up over the question.
   */
  #focusView(force: boolean): void {
    const v = this.#view?.el;
    const name = this.#viewName;
    if (!v || name === 'loading') return; // keep wanting focus until the questions are ready
    this.#wantFocus = false;
    if (name === 'pill' || name === 'record') {
      if (!force) return;
      if (this.#composer) this.#composer.focus();
      else v.querySelector<HTMLElement>('button')?.focus();
      return;
    }
    const touch = matchMedia('(pointer: coarse)').matches;
    const target =
      (this.#focusBack ? v.querySelector<HTMLElement>('.foot [data-act="back"]') : null) ??
      (name === 'review' ? v.querySelector<HTMLElement>('.foot .btn.primary') : null) ??
      v.querySelector<HTMLElement>('[data-opt][tabindex="0"]') ??
      (touch ? null : v.querySelector<HTMLElement>('textarea')) ??
      v.querySelector<HTMLElement>('.foot .btn.primary:not([hidden])') ??
      v;
    // After the render finishes: focusing a text field dispatches TEXT_FOCUS, which must not
    // happen in the middle of a render.
    queueMicrotask(() => {
      target.focus({ preventScroll: true });
      // A tall question opens at its start; arrow keys scroll to the rows from there (round 11).
      if (!v.hasAttribute('data-tall')) target.scrollIntoView?.({ block: 'nearest' });
    });
  }

  #modality(): void {
    this.#view?.el.toggleAttribute('data-pointer', usingPointer());
  }

  #announce(message: string): void {
    // Clear first, so the same sentence twice in a row is still read out.
    this.#live.textContent = '';
    setTimeout(() => (this.#live.textContent = message), 30);
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
    this.#dispatch({ type: Act.REPLY, text });
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

  /** Show an edge shadow only where content is hidden past the edge (DESIGN §3). */
  #edges(): void {
    const card = this.#view?.el;
    const scroll = card?.querySelector('.scroll');
    if (!card || !scroll) return;
    // A header taller than a third of the card scrolls away instead of sticking (round 7).
    const top = card.querySelector<HTMLElement>('.top');
    const max = parseFloat(getComputedStyle(card).maxHeight);
    const tall = !!top && max > 0 && top.offsetHeight > max / 3;
    card.toggleAttribute('data-tall', tall);
    // Focus scrolls stop below the sticky header, never under it (round 11).
    (scroll as HTMLElement).style.scrollPaddingBlockStart = top && !tall ? `${top.offsetHeight}px` : '';
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
      case 'form': return formView(ctx);
    }
  }

  /** Timers and clarify:* events that follow a transition. Each event fires exactly once. */
  #effects(prev: State, next: State, action: Action): void {
    // Toasts disappear by themselves after a while
    if (next.toast !== prev.toast) {
      clearTimeout(this.#toastTimer);
      if (next.toast) this.#toastTimer = window.setTimeout(this.#toastDone, TOAST_MS);
    }

    const quiet = [Act.OPEN, Act.STREAM, Act.RESET, Act.REVISE].includes(action.type);
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
      if (action.type !== Act.COMPOSE) this.#composer?.focus();
    }
    if (action.type === Act.REOPEN || action.type === Act.REVISE) {
      if (action.type === Act.REOPEN && prev.compose) this.#composer?.takeBack();
      this.#emit('reopen', null);
      this.#focusView(true);
    }
    if (action.type === Act.COMPOSE && next.compose) {
      const detail = { text: next.compose.text, questionId: action.questionId, optionId: action.optionId };
      // Not prevented → we start the sentence ourselves. Prevented → the app inserts it.
      if (this.#emit('compose', detail, true)) this.#composer?.insert(detail.text);
    }
    this.#speak(prev, next, action);
  }

  /** What a screen reader hears after a transition (BUILD §5.4). */
  #speak(prev: State, next: State, action: Action): void {
    const t = this.#ctx().t;
    const qs = next.q?.questions ?? [];
    const label = (id: string) => qs.find((q) => q.id === id)?.label ?? '';
    const say: string[] = [];
    if (next.toast && next.toast !== prev.toast) {
      const k = next.toast;
      say.push(
        k.kind === 'skipped' ? t('liveSkipped', { label: label(k.questionId) })
          : k.kind === 'cleared' ? t('liveCleared')
          : t('liveLimit', { max: k.max }),
      );
    }
    if (action.type === Act.DELEGATE && next.drafts[action.questionId]?.delegated) {
      say.push(t('liveDelegated', { label: label(action.questionId) }));
    }
    const sequential = next.q?.flow === 'sequential';
    const newStep = next.status === 'answering' && (prev.status !== 'answering' || prev.step !== next.step);
    if (sequential && newStep && qs[next.step]) {
      say.push(t('liveStep', { n: next.step + 1, total: qs.length, prompt: qs[next.step]!.prompt }));
    }
    const entered = (st: string) => next.status === st && prev.status !== st;
    if (entered('reviewing')) say.push(t('liveReview'));
    if (entered('answered') && next.record?.kind === 'answered') say.push(t('liveSent'));
    if (entered('minimised')) say.push(t('liveMinimised'));
    if (entered('error')) say.push(`${t('liveFailed')} ${next.error ?? ''}`.trim());
    if (say.length) this.#announce(say.join(' '));
  }

  /**
   * A toast waits while it's hovered or focused, so nobody loses Undo while reaching for it (F13),
   * and while the tab is hidden, so Undo is still there when you come back (round 10).
   */
  #toastDone = (): void => {
    const toast = this.#root.querySelector<HTMLElement>('.toast');
    if (document.hidden || toast?.matches(':hover, :focus-within')) {
      this.#toastTimer = window.setTimeout(this.#toastDone, 1000);
      return;
    }
    // It leaves the way it came in. Undo pressed during the fade replaces the toast, so only time
    // out the one that was fading.
    const fading = this.#s.toast;
    void (toast ? leave(toast) : Promise.resolve()).then(() => {
      if (this.#s.toast === fading) this.#dispatch({ type: Act.TOAST_TIMEOUT });
    });
  };

  /** Fire clarify:submit (or clarify:revise) after the undo window. Not prevented → answered. */
  #scheduleSubmit(s: State): void {
    const revising = s.revising;
    const fire = (): void => {
      if (this.#s.status !== 'submitting') return; // undone in the window
      // The window just closed: the countdown and its Undo go, and the button says Sending… (round 12).
      this.#render();
      const ok = this.#emit(revising ? 'revise' : 'submit', buildResult(this.#s, 'submitted'), true);
      if (ok) this.#dispatch({ type: Act.SUBMIT_OK });
    };
    clearTimeout(this.#submitTimer);
    if (s.undoUntil) {
      this.#submitTimer = window.setTimeout(fire, Math.max(0, s.undoUntil - Date.now()));
      // Redraw the "Sending in 3s" countdown each second until the send goes out or is undone.
      const tick = window.setInterval(() => (this.#s.status === 'submitting' ? this.#render() : clearInterval(tick)), 1000);
    } else queueMicrotask(fire);
  }

  #emit(name: string, detail: unknown, cancelable = false): boolean {
    return this.dispatchEvent(new CustomEvent(`clarify:${name}`, { detail, bubbles: true, composed: true, cancelable }));
  }

  // ── DOM events → actions ──────────────────────────────────────────────

  #current() {
    return this.#s.q?.questions[this.#s.step];
  }

  /** The question an event belongs to: its block in the all flow, else the current step. */
  #questionOf(el: Element) {
    const id = el.closest<HTMLElement>('[data-q]')?.dataset.q;
    return id ? this.#s.q?.questions.find((q) => q.id === id) : this.#current();
  }

  /** Sequential: after a single pick or "Decide for me", confirm briefly, then move on. */
  #moveOnSoon(): void {
    if (this.#s.q?.flow !== 'sequential') return;
    clearTimeout(this.#advance);
    this.#advance = window.setTimeout(() => this.#dispatch({ type: Act.NEXT }), CONFIRM_MS);
  }

  #onClick(e: Event): void {
    const target = e.target as Element;
    const act = target.closest<HTMLElement>('[data-act]');
    if (act && !(act as HTMLButtonElement).disabled && act.getAttribute('aria-disabled') !== 'true') return this.#onAct(act.dataset.act!, act.dataset.q, act.dataset.step);

    const row = target.closest<HTMLElement>('[data-opt]');
    const q = row ? this.#questionOf(row) : undefined;
    if (!row || !q || row.getAttribute('aria-disabled') === 'true') return;
    const id = row.dataset.opt!;

    if (id === OTHER) {
      this.#dispatch({ type: Act.OTHER_FOCUS, questionId: q.id });
      if (!draftOf(this.#s, q.id).otherActive) return; // unticked: nothing to type into
      (row.nextElementSibling?.querySelector<HTMLElement>('[data-input]') ??
        row.closest('[data-q]')?.querySelector<HTMLElement>('input[data-input]'))?.focus();
    } else if (id === DELEGATE) {
      this.#dispatch({ type: Act.DELEGATE, questionId: q.id });
      if (draftOf(this.#s, q.id).delegated) this.#moveOnSoon();
    } else if (q.type === 'multi') {
      this.#dispatch({ type: Act.TOGGLE, questionId: q.id, optionId: id });
    } else if (q.options.find((o) => o.id === id)?.compose != null) {
      this.#dispatch({ type: Act.COMPOSE, questionId: q.id, optionId: id });
    } else {
      this.#dispatch({ type: Act.SELECT, questionId: q.id, optionId: id });
      this.#moveOnSoon();
    }
  }

  #onAct(act: string, questionId?: string, step?: string): void {
    const q = this.#current();
    switch (act) {
      case 'back':
        // Focus stays on Back in the new step (round 21): landing on an option would make a second
        // Enter pick it. The ← key still lands on the options.
        this.#focusBack = true;
        this.#dispatch({ type: Act.BACK });
        this.#focusBack = false;
        return;
      case 'minimise': return this.#dispatch({ type: Act.MINIMISE });
      case 'reopen': return this.#dispatch({ type: Act.REOPEN });
      case 'undo': return this.#dispatch({ type: Act.UNDO });
      case 'undo-send': return this.#dispatch({ type: Act.UNDO_SUBMIT });
      case 'skip': return q ? this.#dispatch({ type: Act.SKIP, questionId: q.id }) : undefined;
      case 'next': return this.#dispatch({ type: Act.NEXT });
      case 'send':
        this.#dispatch({ type: Act.SUBMIT });
        // A blocked send moves focus to the first question that needs an answer: the move itself
        // is what a screen reader announces, with the error it now describes (round 11).
        if (this.#s.attempted && this.#s.status === 'answering') {
          this.#root.querySelector<HTMLElement>('.q.invalid textarea, .q.invalid [data-opt][tabindex="0"]')?.focus();
        }
        return;
      case 'skip-all': return this.#dispatch({ type: Act.SKIP_ALL });
      case 'retry': return this.#dispatch({ type: Act.RETRY });
      case 'start-over': return this.#dispatch({ type: Act.START_OVER });
      case 'revise': return this.#dispatch({ type: Act.REVISE });
      case 'edit': return questionId ? this.#dispatch({ type: Act.EDIT, questionId }) : undefined;
      case 'goto': return this.#dispatch({ type: Act.GOTO, step: Number(step) });
    }
  }

  #onInput(e: Event): void {
    const el = e.target as HTMLInputElement | HTMLTextAreaElement;
    const q = this.#questionOf(el);
    if (!q) return;
    if (el.dataset.input === OTHER) this.#dispatch({ type: Act.OTHER_INPUT, questionId: q.id, text: el.value });
    if (el.dataset.input === 'text') this.#dispatch({ type: Act.TEXT_INPUT, questionId: q.id, text: el.value });
  }

  #onFocusIn(e: Event): void {
    const el = e.target as HTMLElement;
    const q = this.#questionOf(el);
    if (q && el.dataset.input === 'text') this.#dispatch({ type: Act.TEXT_FOCUS, questionId: q.id });
  }

  /**
   * Keyboard (BUILD §5.1). Only keys pressed inside the card arrive here (the listener is on the
   * shadow root). Keys are ignored while an IME is composing, so Japanese or Chinese input is safe.
   */
  #onKeyDown(e: KeyboardEvent): void {
    if (e.isComposing || e.defaultPrevented) return;
    const t = e.target as HTMLElement;
    const s = this.#s;
    const field = t.matches('input, textarea');
    const mod = e.metaKey || e.ctrlKey;

    // ⌘Z / Ctrl+Z is our undo, except inside a text field, where it's the browser's own.
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') {
      if (field) return;
      e.preventDefault();
      return this.#dispatch({ type: s.status === 'submitting' ? Act.UNDO_SUBMIT : Act.UNDO });
    }
    if (mod || e.altKey) return;

    const rtl = getComputedStyle(this).direction === 'rtl';
    const sequential = s.q?.flow === 'sequential';

    if (e.key === 'Escape') {
      e.preventDefault();
      // In "Something else", Esc leaves the field (text kept) instead of minimising.
      if (t.dataset.input === OTHER) return this.#focusOther(t);
      return this.#dispatch({ type: Act.MINIMISE });
    }

    if (field) {
      const q = this.#questionOf(t);
      // "Something else" is a one-line answer in a textarea (so it wraps): Enter never adds a line.
      if (e.key === 'Enter' && t.dataset.input === OTHER) e.preventDefault();
      if (e.key === 'Enter' && !e.shiftKey && sequential && q && canContinue(q, draftOf(s, q.id))) {
        e.preventDefault();
        this.#dispatch({ type: Act.NEXT });
      }
      // ↑ at the very start of "Something else" goes back up to the options.
      if (e.key === 'ArrowUp' && t.dataset.input === OTHER && (t as HTMLTextAreaElement).selectionStart === 0) {
        e.preventDefault();
        this.#focusOther(t, -1);
      }
      return;
    }

    const row = t.closest<HTMLElement>('[data-opt]');
    if (row) {
      const chips = row.classList.contains('chip');
      const group = this.#groupOf(row);
      const i = group.indexOf(row);
      // Lists move with ↑/↓ (← is Back there). Chips flow in a line, so ←/→ move too, mirrored in RTL.
      const fwd = e.key === 'ArrowDown' || (chips && e.key === (rtl ? 'ArrowLeft' : 'ArrowRight'));
      const bwd = e.key === 'ArrowUp' || (chips && e.key === (rtl ? 'ArrowRight' : 'ArrowLeft'));
      const to = fwd ? (i + 1) % group.length : bwd ? (i - 1 + group.length) % group.length : e.key === 'Home' ? 0 : e.key === 'End' ? group.length - 1 : -1;
      if (to >= 0 && group.length) {
        e.preventDefault();
        rove(group, group[to]!);
        group[to]!.focus();
        return;
      }
      const q = this.#questionOf(row);
      // Multi-select never moves on by itself: there, Enter means Continue (Space toggles).
      const enterContinues = sequential && q?.type === 'multi' && row.dataset.opt !== DELEGATE && row.dataset.opt !== OTHER;
      if (e.key === 'Enter' && enterContinues) {
        e.preventDefault();
        return this.#dispatch({ type: Act.NEXT });
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        row.click();
        return;
      }
    }

    // 1–9 pick the option with that number (sequential lists; they're the visible key badges).
    if (/^[1-9]$/.test(e.key) && this.#viewName === 'step') {
      const r = this.#root.querySelectorAll<HTMLElement>('.list [data-opt]:not(.other):not(.delegate)')[Number(e.key) - 1];
      if (r && r.getAttribute('aria-disabled') !== 'true') {
        e.preventDefault();
        r.focus();
        r.click();
      }
      return;
    }

    // ← goes back (→ in right-to-left languages), in the steps and on review.
    if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft') && (this.#viewName === 'step' || this.#viewName === 'review')) {
      e.preventDefault();
      this.#dispatch({ type: Act.BACK });
    }
  }

  /** The usable rows of the group a row belongs to. */
  #groupOf(row: HTMLElement): HTMLElement[] {
    const box = row.closest('[role="radiogroup"], [role="group"]:not(.card)');
    return Array.from(box?.querySelectorAll<HTMLElement>('[data-opt]') ?? [row]).filter(
      (r) => r.getAttribute('aria-disabled') !== 'true',
    );
  }

  /** From the "Something else" field back to its row (or the row above it, with step -1). */
  #focusOther(input: HTMLElement, step = 0): void {
    const row =
      (input.closest('.other-field')?.previousElementSibling as HTMLElement | null) ??
      input.closest('[data-q]')?.querySelector<HTMLElement>(`[data-opt="${OTHER}"]`);
    if (!row) return;
    const group = this.#groupOf(row);
    const target = group[Math.max(0, group.indexOf(row) + step)] ?? row;
    rove(group, target);
    target.focus();
  }
}
