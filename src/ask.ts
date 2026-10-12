// ask(): the promise-based way in for agent code (BUILD §6.4).
//
//   const result = await ask(questionnaire, { container: composerSlot, transcript: messages });
//
// It resolves when the user finishes: sent, skipped, replied in their own words, or expired
// (abort or a newer ask). It never rejects for something the user did.

import type { AgentClarifier } from './element.js';
import type { ClarifyResult, Flow, Questionnaire, ReviewMode } from './model/types.js';

export interface AskOptions {
  /** Use this element. Default: a new one in `container`, else the first one on the page. */
  element?: AgentClarifier;
  /** Where a new card goes while it asks (usually next to the composer). */
  container?: Element;
  /**
   * The conversation. When given, each ask gets its own card, and when it's done the card moves
   * here as a record (so every clarification stays in the history). Reopening it ("Edit answers")
   * moves it back to `container` until it's sent again.
   */
  transcript?: Element;
  placement?: 'replace' | 'dock';
  flow?: Flow;
  review?: ReviewMode;
  undoWindow?: number;
  composer?: string | Element;
  /** Aborting expires the card ("The agent moved on") and resolves with status 'dismissed'. */
  signal?: AbortSignal;
}

const DONE = ['clarify:submit', 'clarify:skip', 'clarify:reply', 'clarify:expire'] as const;
const open = new WeakMap<AgentClarifier, () => void>();

export function ask(q: Questionnaire, opts: AskOptions = {}): Promise<ClarifyResult> {
  const fresh = !opts.element && (opts.transcript || !document.querySelector('agent-clarifier'));
  const el = opts.element ?? (fresh ? document.createElement('agent-clarifier') : document.querySelector('agent-clarifier')!);
  if (fresh) {
    if (!opts.container) throw new Error('[agent-clarifier] ask() needs a `container` to put the card in');
    opts.container.append(el);
  }

  // A newer question takes over: the earlier one, if still waiting, becomes "the agent moved on".
  open.get(el)?.();

  if (opts.placement) el.placement = opts.placement;
  if (opts.flow) el.flow = opts.flow;
  if (opts.review) el.review = opts.review;
  if (opts.undoWindow !== undefined) el.undoWindow = opts.undoWindow;
  if (opts.composer) el.composer = opts.composer;

  return new Promise<ClarifyResult>((resolve) => {
    const finish = (e: Event): void => {
      // With ask(), the awaiting code does the sending, so the card counts as answered as soon as
      // the result is handed over, even if another listener prevented the submit.
      // Checked after the event has finished dispatching: other listeners may run after this one.
      queueMicrotask(() => {
        if (e.type === 'clarify:submit' && e.defaultPrevented && el.state === 'submitting') el.markAnswered();
      });
      cleanup();
      if (opts.transcript) opts.transcript.append(el);
      resolve((e as CustomEvent<ClarifyResult>).detail);
    };
    const abort = (): void => el.expire();
    const cleanup = (): void => {
      for (const name of DONE) el.removeEventListener(name, finish);
      opts.signal?.removeEventListener('abort', abort);
      open.delete(el);
    };
    for (const name of DONE) el.addEventListener(name, finish);
    opts.signal?.addEventListener('abort', abort, { once: true });
    open.set(el, abort);

    // Reopened from the record: back to the composer while it's being edited, then back again.
    if (opts.transcript && opts.container) {
      const container = opts.container;
      el.addEventListener('clarify:reopen', () => container.append(el));
      for (const name of ['clarify:revise', 'clarify:reply', 'clarify:skip']) {
        el.addEventListener(name, (e) => {
          if (!(e.type === 'clarify:revise' && e.defaultPrevented)) queueMicrotask(() => opts.transcript!.append(el));
        });
      }
    }

    if (opts.signal?.aborted) {
      el.open(q);
      abort();
      return;
    }
    el.open(q);
  });
}
