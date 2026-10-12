// Questions the UI and the reducer ask about the state. Pure reads, no changes.

import type {
  Answer,
  ClarifyResult,
  Draft,
  NormalizedQuestion,
  ResultStatus,
  ReviewMode,
  State,
} from './types.js';

/** Where one question stands. 'unanswered' also covers picks below `min`. */
export type QuestionState = 'answered' | 'delegated' | 'skipped' | 'unanswered';

export function emptyDraft(): Draft {
  return { values: [], other: '', otherActive: false, skipped: false, delegated: false, text: '' };
}

export function draftOf(state: State, questionId: string): Draft {
  return state.drafts[questionId] ?? emptyDraft();
}

/** How many things are picked. "Something else" with text counts as one. */
export function picks(q: NormalizedQuestion, d: Draft): number {
  if (q.type === 'text') return d.text.trim() ? 1 : 0;
  return d.values.length + (d.otherActive && d.other.trim() ? 1 : 0);
}

/** Ticked boxes, for the pick limit: an open "Something else" holds its slot even before it has text,
 *  or typing into it could go past `max` (round 23). */
export const ticked = (d: Draft): number => d.values.length + +d.otherActive;

export function questionState(q: NormalizedQuestion, d: Draft): QuestionState {
  if (d.delegated) return 'delegated';
  if (d.skipped) return 'skipped';
  const n = picks(q, d);
  return n > 0 && n >= q.min ? 'answered' : 'unanswered';
}

/** Continue is allowed: the question has a complete answer (Decide for me counts). */
export function canContinue(q: NormalizedQuestion, d: Draft): boolean {
  const s = questionState(q, d);
  return s === 'answered' || s === 'delegated';
}

/** Done with, one way or another: answered, delegated or skipped. */
export function isSettled(q: NormalizedQuestion, d: Draft): boolean {
  return canContinue(q, d) || d.skipped;
}

/** Shown as an error after a send attempt: required and empty, or some picks but below `min`. */
export function isInvalid(q: NormalizedQuestion, d: Draft): boolean {
  if (canContinue(q, d)) return false;
  return q.required || (!d.skipped && picks(q, d) > 0);
}

export function needsReview(state: State, review: ReviewMode): boolean {
  if (review !== 'auto') return review === 'always';
  const qs = state.q?.questions ?? [];
  return qs.length >= 3 || qs.some((q) => !canContinue(q, draftOf(state, q.id)));
}

/** True when at least one question has a real answer or was handed to the agent. */
export function anyAnswered(state: State): boolean {
  return (state.q?.questions ?? []).some((q) => canContinue(q, draftOf(state, q.id)));
}

export function progress(state: State): { step: number; answered: number; total: number } {
  const qs = state.q?.questions ?? [];
  return {
    step: state.step,
    answered: qs.filter((q) => canContinue(q, draftOf(state, q.id))).length,
    total: qs.length,
  };
}

/**
 * One question's answer for the result. Picks below `min` are still sent as answered:
 * when the user replies in their own words, "the picks so far" should arrive as picked.
 * (A normal send is blocked before it gets here; see isInvalid.)
 */
export function buildAnswer(q: NormalizedQuestion, d: Draft): Answer {
  if (d.delegated) return { status: 'delegated', values: [], labels: [] };
  if (d.skipped || picks(q, d) === 0) return { status: 'skipped', values: [], labels: [] };
  if (q.type === 'text') {
    const text = d.text.trim();
    return { status: 'answered', values: [text], labels: [text] };
  }
  const labels = d.values.map((id) => q.options.find((o) => o.id === id)?.label ?? id);
  const other = d.otherActive ? d.other.trim() : '';
  return other
    ? { status: 'answered', values: d.values, labels: [...labels, other], other }
    : { status: 'answered', values: d.values, labels };
}

export function buildResult(
  state: State,
  status: ResultStatus,
  reply?: string,
): ClarifyResult {
  const answers: Record<string, Answer> = {};
  for (const q of state.q?.questions ?? []) answers[q.id] = buildAnswer(q, draftOf(state, q.id));
  const result: ClarifyResult = {
    questionnaireId: state.q?.id ?? '',
    status,
    delivery: reply === undefined ? 'card' : 'composer',
    answers,
  };
  if (reply !== undefined) result.message = reply;
  return result;
}

/** The furthest step the user can jump to: the first one not settled yet (round 23). */
export function reach(state: State): number {
  const qs = state.q?.questions ?? [];
  const i = qs.findIndex((q) => !isSettled(q, draftOf(state, q.id)));
  return i < 0 ? qs.length : i;
}
