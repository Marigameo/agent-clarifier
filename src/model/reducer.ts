// The state machine (BUILD §4.2). Pure: (state, action, env) → state.
//
// Rules that hold for every action:
// - An action that isn't allowed in the current status, or changes nothing, returns the *same*
//   state object. The element can skip work with a single `next === prev` check.
// - States are never mutated. Every change makes new objects, so snapshots in `history` can
//   safely share drafts with the live state.
// - Answer changes push a snapshot first; Undo pops it. Navigation (Back, Edit, Goto) never pushes.
// - A toast lasts until the next action that changes anything, unless that action sets a new one.

import {
  anyAnswered,
  buildResult,
  draftOf,
  emptyDraft,
  isInvalid,
  isSettled,
  needsReview,
  picks,
} from './selectors';
import type {
  Action,
  ClarifyRecord,
  Draft,
  Env,
  NormalizedQuestionnaire,
  Snapshot,
  State,
  Status,
} from './types';
import * as Act from './act';

export const HISTORY_LIMIT = 50;

export function initialState(): State {
  return {
    status: 'hidden',
    q: null,
    partial: false,
    step: 0,
    drafts: {},
    returnTo: null,
    resumeTo: null,
    attempted: false,
    error: null,
    toast: null,
    record: null,
    revising: false,
    compose: null,
    undoUntil: null,
    history: [],
    typing: null,
  };
}

/** Fresh drafts with each question's `default` applied. */
export function initialDrafts(q: NormalizedQuestionnaire | null): Record<string, Draft> {
  const drafts: Record<string, Draft> = {};
  for (const x of q?.questions ?? []) {
    const d = emptyDraft();
    if (x.type === 'text') d.text = x.default[0] ?? '';
    else d.values = [...x.default];
    drafts[x.id] = d;
  }
  return drafts;
}

export function reducer(state: State, action: Action, env: Env): State {
  let next = reduce(state, action, env);
  // Focusing a field isn't an edit, so it never dismisses a toast: skipping into a text question
  // used to lose its Undo at once (round 11).
  if (action.type === Act.TEXT_FOCUS) return next;
  // Anything but typing ends a typing session, so the next keystroke saves a fresh undo step.
  if (next !== state && next.typing !== null && action.type !== Act.TEXT_INPUT) next = { ...next, typing: null };
  // The previous toast goes away on any action that changed something, unless it set a new one.
  return next !== state && next.toast !== null && next.toast === state.toast
    ? { ...next, toast: null }
    : next;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** History with the current state added, unless it's identical to the last snapshot. */
function push(s: State): Snapshot[] {
  const snap: Snapshot = { step: s.step, drafts: s.drafts, status: s.status };
  const top = s.history[s.history.length - 1];
  return top && same(top, snap) ? s.history : [...s.history, snap].slice(-HISTORY_LIMIT);
}

/**
 * Change one question's draft.
 * - 'change': push history only if the draft actually changes (a pick, a toggle)
 * - 'always': push even if nothing changes yet (entering a text field starts a typing session)
 * - 'never':  never push (each keystroke)
 */
function edit(
  s: State,
  questionId: string,
  change: Partial<Draft>,
  history: 'change' | 'always' | 'never',
): State {
  const old = draftOf(s, questionId);
  const draft = { ...old, ...change };
  const changed = !same(old, draft);
  const h = history === 'always' || (history === 'change' && changed) ? push(s) : s.history;
  if (!changed && h === s.history) return s;
  return { ...s, drafts: changed ? { ...s.drafts, [questionId]: draft } : s.drafts, history: h };
}

/** The card is done: show a record and forget the session's history. */
function done(s: State, record: ClarifyRecord, status: Status = 'answered'): State {
  return {
    ...s,
    status,
    record,
    history: [],
    toast: null,
    undoUntil: null,
    resumeTo: null,
    returnTo: null,
    compose: null,
    error: null,
    attempted: false,
    revising: false,
  };
}

/** Every question skipped (or none answered) is the same as Skip all. */
const finishSkipped = (s: State): State =>
  done(s, { kind: 'skipped', result: buildResult(s, 'skipped') });

function submit(s: State, env: Env): State {
  const qs = s.q?.questions ?? [];
  if (qs.some((q) => isInvalid(q, draftOf(s, q.id)))) return s.attempted ? s : { ...s, attempted: true };
  if (!anyAnswered(s)) return finishSkipped(s);
  return {
    ...s,
    status: 'submitting',
    resumeTo: s.status,
    undoUntil: env.undoWindow > 0 ? env.now + env.undoWindow : null,
    attempted: false,
  };
}

/** Sequential: leave the current step (after a pick, Continue or Skip). */
function advance(s: State, env: Env): State {
  const last = (s.q?.questions.length ?? 0) - 1;
  if (s.returnTo === 'review') return { ...s, status: 'reviewing', returnTo: null };
  if (s.step < last) return { ...s, step: s.step + 1 };
  if (!anyAnswered(s)) return finishSkipped(s);
  return needsReview(s, env.review) ? { ...s, status: 'reviewing' } : submit(s, env);
}

/** Exhaustiveness check: this only compiles if every action type is handled above it. */
const unhandled = (_action: never, s: State): State => s;

// ── reduce ───────────────────────────────────────────────────────────────────

function reduce(s: State, a: Action, env: Env): State {
  const qs = s.q?.questions ?? [];
  const answering = s.status === 'answering';
  const sequential = s.q?.flow === 'sequential';
  const find = (id: string) => qs.find((q) => q.id === id);

  switch (a.type) {
    case Act.OPEN: {
      if (!['hidden', 'answered', 'expired'].includes(s.status)) return s;
      if (!a.q && !a.partial) return s;
      return {
        ...initialState(),
        status: a.partial ? 'loading' : 'answering',
        q: a.q,
        partial: a.partial,
        drafts: initialDrafts(a.q),
      };
    }

    case Act.STREAM: {
      // Streaming can finish while the card is minimised; it then reopens into answering.
      const waiting = s.status === 'loading' || (s.status === 'minimised' && s.resumeTo === 'loading');
      if (!waiting || (!a.q && !a.partial)) return s;
      const ready: Status = a.partial ? 'loading' : 'answering';
      return {
        ...s,
        q: a.q,
        partial: a.partial,
        drafts: initialDrafts(a.q),
        ...(s.status === 'loading' ? { status: ready } : { resumeTo: ready }),
      };
    }

    case Act.SELECT: {
      const q = find(a.questionId);
      const o = q?.options.find((x) => x.id === a.optionId);
      if (!answering || !q || q.type !== 'single' || !o || o.disabled || o.compose !== null) return s;
      return edit(
        s,
        q.id,
        { values: [o.id], other: '', otherActive: false, delegated: false, skipped: false },
        'change',
      );
    }

    case Act.TOGGLE: {
      const q = find(a.questionId);
      const o = q?.options.find((x) => x.id === a.optionId);
      if (!answering || !q || q.type !== 'multi' || !o || o.disabled) return s;
      const d = draftOf(s, q.id);
      const on = d.values.includes(o.id);
      if (!on && picks(q, d) >= q.max) return { ...s, toast: { kind: 'limit', max: q.max } };
      const chosen = on ? d.values.filter((v) => v !== o.id) : [...d.values, o.id];
      // Keep picks in the options' order, so the result reads the same however they were clicked.
      const values = q.options.map((x) => x.id).filter((id) => chosen.includes(id));
      return edit(s, q.id, { values, delegated: false, skipped: false }, 'change');
    }

    case Act.OTHER_FOCUS: {
      const q = find(a.questionId);
      if (!answering || !q?.other) return s;
      const d = draftOf(s, q.id);
      if (q.type === 'multi' && !d.otherActive && picks(q, d) >= q.max) {
        return { ...s, toast: { kind: 'limit', max: q.max } };
      }
      // A checkbox toggles: pressing a ticked "Something else" unticks it. Its text stays in the
      // draft, so ticking it again (or Undo) brings it back (round 11).
      if (q.type === 'multi' && d.otherActive) return edit(s, q.id, { otherActive: false }, 'always');
      const single = q.type === 'single' ? { values: [] } : {};
      return edit(s, q.id, { otherActive: true, delegated: false, skipped: false, ...single }, 'always');
    }

    case Act.OTHER_INPUT: {
      const q = find(a.questionId);
      if (!answering || !q?.other) return s;
      const single = q.type === 'single' ? { values: [] } : {};
      return edit(
        s,
        q.id,
        { other: a.text, otherActive: true, delegated: false, skipped: false, ...single },
        'never',
      );
    }

    // Focus starts a new typing session; the undo step is saved by its first keystroke, not by the
    // focus, so focusing changes nothing an Undo could step back over (round 11).
    case Act.TEXT_FOCUS: {
      const q = find(a.questionId);
      if (!answering || q?.type !== 'text' || s.typing === null) return s;
      return { ...s, typing: null };
    }

    case Act.TEXT_INPUT: {
      const q = find(a.questionId);
      if (!answering || q?.type !== 'text') return s;
      const next = edit(s, q.id, { text: a.text, delegated: false, skipped: false }, s.typing === q.id ? 'never' : 'always');
      return next.typing === q.id ? next : { ...next, typing: q.id };
    }

    case Act.DELEGATE: {
      const q = find(a.questionId);
      if (!answering || !q?.delegate) return s;
      // In the all flow the row is a toggle; in sequential, picking it again just moves on.
      if (draftOf(s, q.id).delegated && !sequential) {
        return edit(s, q.id, { delegated: false }, 'change');
      }
      return edit(
        s,
        q.id,
        { delegated: true, values: [], other: '', otherActive: false, text: '', skipped: false },
        'change',
      );
    }

    case Act.NEXT: {
      const q = qs[s.step];
      if (!answering || !sequential || !q || !isSettled(q, draftOf(s, q.id))) return s;
      return advance(s, env);
    }

    case Act.BACK: {
      if (s.status === 'reviewing') return { ...s, status: 'answering', step: qs.length - 1 };
      if (!answering || !sequential || s.step === 0) return s;
      return { ...s, step: s.step - 1 };
    }

    case Act.GOTO: {
      const q = qs[a.step];
      if (!answering || !sequential || !q || a.step === s.step) return s;
      if (!isSettled(q, draftOf(s, q.id))) return s;
      return { ...s, step: a.step };
    }

    case Act.SKIP: {
      const q = find(a.questionId);
      if (!answering || !q || q.required || q.delegate) return s;
      const skipped = edit(
        s,
        q.id,
        { skipped: true, values: [], other: '', otherActive: false, text: '', delegated: false },
        'change',
      );
      const withToast: State = { ...skipped, toast: { kind: 'skipped', questionId: q.id } };
      return sequential && qs[s.step]?.id === q.id ? advance(withToast, env) : withToast;
    }

    case Act.SKIP_ALL: {
      // Not offered when a question is required: the agent needs that answer.
      if (!answering || sequential || qs.some((q) => q.required)) return s;
      const drafts: Record<string, Draft> = {};
      for (const q of qs) drafts[q.id] = { ...emptyDraft(), skipped: true };
      return finishSkipped({ ...s, drafts });
    }

    case Act.EDIT: {
      const step = qs.findIndex((q) => q.id === a.questionId);
      if (s.status !== 'reviewing' || step < 0) return s;
      return { ...s, status: 'answering', step, returnTo: 'review' };
    }

    case Act.START_OVER: {
      if (s.status !== 'reviewing') return s;
      return {
        ...s,
        history: push(s),
        drafts: initialDrafts(s.q),
        step: 0,
        status: 'answering',
        returnTo: null,
        toast: { kind: 'cleared' },
      };
    }

    case Act.UNDO: {
      const top = s.history[s.history.length - 1];
      if (!(answering || s.status === 'reviewing') || !top) return s;
      return { ...s, ...top, history: s.history.slice(0, -1), toast: null };
    }

    case Act.SUBMIT: {
      const last = s.step === qs.length - 1;
      const allowed = s.status === 'reviewing' || (answering && (!sequential || last));
      return allowed ? submit(s, env) : s;
    }

    case Act.UNDO_SUBMIT: {
      if (s.status !== 'submitting' || s.undoUntil === null || env.now >= s.undoUntil) return s;
      return { ...s, status: s.resumeTo ?? 'answering', resumeTo: null, undoUntil: null };
    }

    case Act.SUBMIT_OK:
      if (s.status !== 'submitting') return s;
      return done(s, { kind: 'answered', result: buildResult(s, 'submitted') });

    case Act.SUBMIT_FAIL:
      if (s.status !== 'submitting') return s;
      return { ...s, status: 'error', error: a.message, undoUntil: null };

    case Act.RETRY:
      if (s.status !== 'error') return s;
      return { ...s, status: 'submitting', error: null };

    case Act.MINIMISE:
      if (!['loading', 'answering', 'reviewing', 'error'].includes(s.status)) return s;
      return { ...s, status: 'minimised', resumeTo: s.status, toast: null };

    case Act.REOPEN:
      if (s.status !== 'minimised') return s;
      return { ...s, status: s.resumeTo ?? 'answering', resumeTo: null, compose: null };

    case Act.COMPOSE: {
      const q = find(a.questionId);
      const o = q?.options.find((x) => x.id === a.optionId);
      if (!answering || !q || q.type !== 'single' || !o || o.disabled || o.compose === null) return s;
      const picked = edit(
        s,
        q.id,
        { values: [o.id], other: '', otherActive: false, delegated: false, skipped: false },
        'change',
      );
      return {
        ...picked,
        status: 'minimised',
        resumeTo: 'answering',
        compose: { questionId: q.id, text: o.compose },
      };
    }

    case Act.REPLY: {
      // The element only sends this while answering/reviewing in dock mode, where the composer
      // stays visible. The reducer allows it in those statuses and leaves placement to the element.
      const text = a.text.trim();
      if (!text || !s.q || !['minimised', 'answering', 'reviewing'].includes(s.status)) return s;
      return done(s, { kind: 'replied', result: buildResult(s, 'submitted', text) });
    }

    case Act.REVISE: {
      if (s.status !== 'answered' || !s.q) return s;
      const fresh = s.record?.kind === 'skipped' || !anyAnswered(s);
      return {
        ...s,
        status: sequential && !fresh ? 'reviewing' : 'answering',
        step: 0,
        drafts: fresh ? initialDrafts(s.q) : s.drafts,
        revising: true,
        history: [],
        returnTo: null,
      };
    }

    case Act.EXPIRE: {
      // An answered card stays answered: the agent moving on later doesn't undo the answer.
      if (['hidden', 'answered', 'expired'].includes(s.status)) return s;
      const record: ClarifyRecord = { kind: 'expired', result: buildResult(s, 'dismissed') };
      if (a.message) record.message = a.message;
      return done(s, record, 'expired');
    }

    case Act.RESET:
      return s.status === 'hidden' && !s.q ? s : initialState();

    case Act.TOAST_TIMEOUT:
      return s.toast ? { ...s, toast: null } : s;

    default:
      return unhandled(a, s);
  }
}
