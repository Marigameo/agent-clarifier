// Turns whatever an agent or developer passed in into a NormalizedQuestionnaire (BUILD §3.1).
// It fixes what it can and reports each fix as a warning, and refuses only when nothing
// sensible can be shown. Input is `unknown` on purpose: JSON from an agent arrives at runtime,
// where TypeScript's types can't protect us.
//
// Pure: warnings are returned, not printed. The element prints them with console.warn.

import type {
  Flow,
  NormalizedOption,
  NormalizedQuestion,
  NormalizedQuestionnaire,
  QuestionType,
} from './types.js';
import { claim, hash, slug } from './ids.js';

export { hash, slug };

export type WarningCode =
  | 'questionnaire-id'
  | 'flow'
  | 'question-dropped'
  | 'type'
  | 'question-id'
  | 'options-ignored'
  | 'option-dropped'
  | 'option-id'
  | 'too-many-options'
  | 'too-few-options'
  | 'recommended-many'
  | 'recommended-disabled'
  | 'compose-multi'
  | 'compose-and-other'
  | 'min-max'
  | 'default'
  | 'delegate-required';

export interface Warning {
  code: WarningCode;
  /** Where in the input: "questions[1].options[0]". */
  at: string;
}

export type NormalizeResult =
  | { ok: true; q: NormalizedQuestionnaire; warnings: Warning[] }
  | { ok: false; reason: 'empty'; warnings: Warning[] };

export const MAX_OPTIONS = 9;

/** Codes, not sentences: they read clearly on their own and keep ~0.4 KB out of every download.
 *  The README explains each one. */
export function formatWarning(w: Warning): string {
  return `[agent-clarifier] ${w.at}: ${w.code}`;
}

// ── helpers ──────────────────────────────────────────────────────────────────

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A non-blank string, else undefined. */
const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v : undefined;

const int = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : undefined;

// ── normalize ────────────────────────────────────────────────────────────────

export function normalize(input: unknown): NormalizeResult {
  const warnings: Warning[] = [];
  const warn = (code: WarningCode, at: string): void => {
    warnings.push({ code, at });
  };

  const src = isObj(input) ? input : {};
  const raws = Array.isArray(src.questions) ? src.questions : [];
  // `__proto__` as a key would re-prototype the answers object and vanish from the result (round 23).
  const usedIds = new Set<string>(['__proto__']);
  const questions: NormalizedQuestion[] = [];

  raws.forEach((raw, i) => {
    const q = normalizeQuestion(raw, i, usedIds, src.delegate === true, warn);
    if (q) questions.push(q);
  });

  if (questions.length === 0) return { ok: false, reason: 'empty', warnings };

  let id = str(src.id);
  if (!id) {
    id = 'c' + hash(questions.map((q) => q.prompt).join('\n'));
    warn('questionnaire-id', 'questionnaire');
  }

  let flow: Flow = 'sequential';
  if (src.flow === 'all' || src.flow === 'sequential') flow = src.flow;
  else if (src.flow !== undefined) warn('flow', 'questionnaire');

  return {
    ok: true,
    q: { id, title: str(src.title), flow, source: str(src.source), questions },
    warnings,
  };
}

function normalizeQuestion(
  raw: unknown,
  i: number,
  usedIds: Set<string>,
  delegateByDefault: boolean,
  warn: (code: WarningCode, at: string) => void,
): NormalizedQuestion | null {
  const at = `questions[${i}]`;
  const prompt = isObj(raw) ? str(raw.prompt) : undefined;
  if (!isObj(raw) || !prompt) {
    warn('question-dropped', at);
    return null;
  }

  const rawOptions = Array.isArray(raw.options) ? raw.options : [];

  let type: QuestionType;
  if (raw.type === 'single' || raw.type === 'multi' || raw.type === 'text') type = raw.type;
  else {
    type = rawOptions.length > 0 ? 'single' : 'text';
    warn('type', at);
  }

  let id = str(raw.id);
  if (!id || usedIds.has(id)) {
    warn('question-id', at);
    id = `q${i + 1}`;
  }
  id = claim(id, usedIds);

  // Options (single and multi only)
  let options: NormalizedOption[] = [];
  if (type === 'text') {
    if (rawOptions.length > 0) warn('options-ignored', at);
  } else {
    // The ids of the "Something else" and "Decide for me" rows (view/types.ts), so no option can pose as one (round 23).
    const usedOptionIds = new Set<string>(['__other', '__delegate']);
    rawOptions.forEach((o, j) => {
      const oat = `${at}.options[${j}]`;
      const label = isObj(o) ? str(o.label) : undefined;
      if (!isObj(o) || !label) {
        warn('option-dropped', oat);
        return;
      }
      let oid = str(o.id);
      if (!oid || usedOptionIds.has(oid)) {
        warn('option-id', oat);
        oid = slug(label);
      }
      options.push({
        id: claim(oid, usedOptionIds),
        label,
        description: str(o.description),
        recommended: o.recommended === true,
        disabled: o.disabled === true,
        compose: str(o.compose) ?? null,
      });
    });

    if (options.length > MAX_OPTIONS) {
      options = options.slice(0, MAX_OPTIONS);
      warn('too-many-options', at);
    }
    if (options.length < 2) warn('too-few-options', at);

    let hasRecommended = false;
    for (const o of options) {
      if (!o.recommended) continue;
      if (o.disabled) {
        o.recommended = false;
        warn('recommended-disabled', at);
      } else if (hasRecommended) {
        o.recommended = false;
        warn('recommended-many', at);
      } else hasRecommended = true;
    }

    if (type === 'multi' && options.some((o) => o.compose !== null)) {
      for (const o of options) o.compose = null;
      warn('compose-multi', at);
    }
  }

  // "Something else"
  const rawOther = raw.other ?? true;
  const other =
    type === 'text' || rawOther === false
      ? null
      : isObj(rawOther)
        ? { label: str(rawOther.label), placeholder: str(rawOther.placeholder) }
        : {};
  if (other && options.some((o) => o.compose !== null)) warn('compose-and-other', at);

  // Required beats delegate
  const required = raw.required === true;
  let delegate = typeof raw.delegate === 'boolean' ? raw.delegate : delegateByDefault;
  if (required && delegate) {
    if (raw.delegate === true) warn('delegate-required', at);
    delegate = false;
  }

  // min / max: only multi has a range. "Something else" counts as one more choice.
  let min = 0;
  let max = type === 'single' ? 1 : 0;
  if (type === 'multi') {
    const choices = Math.max(1, options.length + (other ? 1 : 0));
    const askedMin = int(raw.min) ?? 1;
    const askedMax = int(raw.max) ?? choices;
    max = Math.min(Math.max(askedMax, 1), choices);
    min = Math.min(Math.max(askedMin, 1), max);
    if (min !== askedMin || max !== askedMax) warn('min-max', at);
  } else if (raw.min !== undefined || raw.max !== undefined) {
    warn('min-max', at);
  }

  // Defaults
  const asked = (Array.isArray(raw.default) ? raw.default : [raw.default]).filter(
    (v): v is string => typeof v === 'string',
  );
  let defaults: string[];
  if (type === 'text') {
    defaults = asked.slice(0, 1);
    if (asked.length > 1) warn('default', at);
  } else {
    const valid = asked.filter((v) => options.some((o) => o.id === v && !o.disabled));
    defaults = valid.slice(0, max);
    if (defaults.length !== asked.length) warn('default', at);
  }

  return {
    id,
    prompt,
    label: str(raw.label) ?? prompt,
    type,
    description: str(raw.description),
    options,
    other,
    required,
    delegate,
    min,
    max,
    default: defaults,
  };
}
