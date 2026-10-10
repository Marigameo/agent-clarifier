// The data contract. Two layers:
// - Input types (Questionnaire, Question, Option) are forgiving: what an agent or a developer writes.
// - Normalized types are strict: every field that changes behaviour is filled in by normalize.ts,
//   so the reducer never has to ask "was this set?". Display-only text (title, description) may
//   still be absent, because absence is a real value there.

// ── Input ────────────────────────────────────────────────────────────────────

export type Flow = 'sequential' | 'all';
export type QuestionType = 'single' | 'multi' | 'text';
export type ReviewMode = 'auto' | 'always' | 'never';

export interface Questionnaire {
  /** Ties the answers back to the agent's request. */
  id: string;
  /** "A few questions before I search" */
  title?: string;
  /** Default 'sequential'. */
  flow?: Flow;
  /** Who is asking: "Claude", "Hotel search (MCP)". */
  source?: string;
  /** Default for every question's `delegate`. */
  delegate?: boolean;
  questions: Question[];
}

export interface Question {
  id: string;
  /** "What's your budget per night?" */
  prompt: string;
  /** Short name for review and the record: "Budget". Defaults to the prompt. */
  label?: string;
  type: QuestionType;
  /** single and multi: 2 to 9 (number keys). */
  options?: Option[];
  /** The "Something else" row. Default true for single and multi. */
  other?: boolean | { label?: string; placeholder?: string };
  /** Default false, so the question can be skipped. */
  required?: boolean;
  /** Show "Decide for me" in place of Skip. Ignored when `required`. */
  delegate?: boolean;
  /** multi only. */
  min?: number;
  max?: number;
  /** Option id(s), or the text for a text question. */
  default?: string | string[];
  /** A helper line under the prompt. */
  description?: string;
}

export interface Option {
  id: string;
  /** "$250-400/night" */
  label: string;
  /** "Boutique, good locations" */
  description?: string;
  /** Gets a badge and is focused first. */
  recommended?: boolean;
  disabled?: boolean;
  /** Picking it starts this sentence in the composer instead (single only). */
  compose?: string;
}

// ── Result ───────────────────────────────────────────────────────────────────

export type ResultStatus = 'submitted' | 'skipped' | 'dismissed';
export type AnswerStatus = 'answered' | 'skipped' | 'delegated';

export interface ClarifyResult {
  questionnaireId: string;
  /** skipped = "just go", dismissed = closed without a choice. */
  status: ResultStatus;
  /** Answered in the card, or by a message sent from the composer. */
  delivery: 'card' | 'composer';
  /** One entry per question, keyed by question id. */
  answers: Record<string, Answer>;
  /** The user's own words, when delivery is 'composer'. */
  message?: string;
}

export interface Answer {
  status: AnswerStatus;
  /** Option ids. [] when skipped or delegated. */
  values: string[];
  /** Human-readable, ready to put in a prompt. */
  labels: string[];
  /** "Something else" text, if used. */
  other?: string;
}

// ── Normalized (what the reducer works with) ─────────────────────────────────

export interface NormalizedOption {
  id: string;
  label: string;
  description?: string;
  recommended: boolean;
  disabled: boolean;
  /** null unless this is a compose option on a single question. */
  compose: string | null;
}

export interface NormalizedQuestion {
  id: string;
  prompt: string;
  label: string;
  type: QuestionType;
  description?: string;
  /** [] for text questions. */
  options: NormalizedOption[];
  /** null when there's no "Something else" row (always null for text). */
  other: { label?: string; placeholder?: string } | null;
  required: boolean;
  delegate: boolean;
  /** multi: at least 1, so Continue always means "I picked something". 0 for single and text. */
  min: number;
  /** multi: at most the number of options. 1 for single, 0 for text. */
  max: number;
  /** Option ids for single and multi, [text] for text, [] for none. */
  default: string[];
}

export interface NormalizedQuestionnaire {
  id: string;
  title?: string;
  flow: Flow;
  source?: string;
  questions: NormalizedQuestion[];
}

// ── State ────────────────────────────────────────────────────────────────────

export type Status =
  | 'hidden'
  | 'loading'
  | 'answering'
  | 'reviewing'
  | 'submitting'
  | 'answered'
  | 'error'
  | 'minimised'
  | 'expired';

/** What the user has done to one question so far. */
export interface Draft {
  values: string[];
  other: string;
  otherActive: boolean;
  skipped: boolean;
  delegated: boolean;
  text: string;
}

/** Toasts carry data, not words: labels.ts turns them into text in the page's language. */
export type Toast =
  | { kind: 'skipped'; questionId: string }
  | { kind: 'cleared' }
  | { kind: 'limit'; max: number };

export type RecordKind = 'answered' | 'skipped' | 'replied' | 'expired';

/** What stays in the transcript once the card is done. */
export interface ClarifyRecord {
  kind: RecordKind;
  result: ClarifyResult;
  /** expire(message) text, if any. */
  message?: string;
}

/** What undo restores. Navigation never creates one. */
export interface Snapshot {
  step: number;
  drafts: Record<string, Draft>;
  status: Status;
}

export interface State {
  status: Status;
  q: NormalizedQuestionnaire | null;
  /** Still streaming questions in. */
  partial: boolean;
  /** Sequential: the current question index. */
  step: number;
  drafts: Record<string, Draft>;
  /** Set by Edit-from-review: the next Continue goes back to review. */
  returnTo: 'review' | null;
  /** Where Reopen returns to. */
  resumeTo: Status | null;
  /** All flow: show required errors only after a send attempt. */
  attempted: boolean;
  error: string | null;
  toast: Toast | null;
  record: ClarifyRecord | null;
  /** Reopened from a record: the next submit fires clarify:revise. */
  revising: boolean;
  /** The sentence a compose option started. The element checks if it was touched on reopen. */
  compose: { questionId: string; text: string } | null;
  /** Undo window deadline (ms timestamp). */
  undoUntil: number | null;
  /** Newest last, capped at 50. */
  history: Snapshot[];
}

/**
 * Everything the reducer needs from the outside world, passed in explicitly.
 * The reducer never reads the clock or the element's attributes itself, which keeps it pure:
 * the same (state, action, env) always gives the same result, so every case is easy to test.
 */
export interface Env {
  review: ReviewMode;
  /** ms, 0 = off. */
  undoWindow: number;
  /** Date.now() at dispatch time. */
  now: number;
}

// ── Actions ──────────────────────────────────────────────────────────────────
// One type per action. The reducer switches on `type`, and the compiler fails the build
// if an action is added here and not handled there.

export type Action =
  | { type: 'OPEN'; q: NormalizedQuestionnaire; partial: boolean }
  | { type: 'STREAM'; q: NormalizedQuestionnaire; partial: boolean }
  | { type: 'SELECT'; questionId: string; optionId: string }
  | { type: 'TOGGLE'; questionId: string; optionId: string }
  | { type: 'OTHER_FOCUS'; questionId: string }
  | { type: 'OTHER_INPUT'; questionId: string; text: string }
  | { type: 'TEXT_FOCUS'; questionId: string }
  | { type: 'TEXT_INPUT'; questionId: string; text: string }
  | { type: 'DELEGATE'; questionId: string }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'GOTO'; step: number }
  | { type: 'SKIP'; questionId: string }
  | { type: 'SKIP_ALL' }
  | { type: 'EDIT'; questionId: string }
  | { type: 'START_OVER' }
  | { type: 'UNDO' }
  | { type: 'SUBMIT' }
  | { type: 'UNDO_SUBMIT' }
  | { type: 'SUBMIT_OK' }
  | { type: 'SUBMIT_FAIL'; message: string }
  | { type: 'RETRY' }
  | { type: 'MINIMISE' }
  | { type: 'REOPEN' }
  | { type: 'COMPOSE'; questionId: string; optionId: string }
  | { type: 'REPLY'; text: string }
  | { type: 'REVISE' }
  | { type: 'EXPIRE'; message?: string }
  | { type: 'RESET' }
  | { type: 'TOAST_TIMEOUT' };

export type ActionType = Action['type'];
