import { describe, expect, it } from 'vitest';
import {
  formatWarning,
  hash,
  normalize,
  slug,
  type WarningCode,
} from '../../src/model/normalize';
import type { NormalizedQuestion, NormalizedQuestionnaire } from '../../src/model/types';

// A valid single question; each case overrides only what its rule is about.
const opts = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `o${i + 1}`, label: `Option ${i + 1}` }));
const one = (q: Record<string, unknown>, top: Record<string, unknown> = {}) => ({
  id: 'trip',
  questions: [{ id: 'a', prompt: 'Pick one', type: 'single', options: opts(3), ...q }],
  ...top,
});

function ok(input: unknown): { q: NormalizedQuestionnaire; first: NormalizedQuestion; codes: WarningCode[] } {
  const r = normalize(input);
  if (!r.ok) throw new Error('expected ok');
  return { q: r.q, first: r.q.questions[0]!, codes: r.warnings.map((w) => w.code) };
}

interface Case {
  rule: string;
  input: unknown;
  check: (r: ReturnType<typeof ok>) => void;
  warns: WarningCode[];
}

// One row per BUILD §3.1 rule, plus the runtime-shape rules that keep agent JSON safe.
const cases: Case[] = [
  // ── Defaults ──
  { rule: 'flow missing → sequential', input: one({}), check: ({ q }) => expect(q.flow).toBe('sequential'), warns: [] },
  { rule: 'flow unknown → sequential, warns', input: one({}, { flow: 'wizard' }), check: ({ q }) => expect(q.flow).toBe('sequential'), warns: ['flow'] },
  { rule: 'flow all is kept', input: one({}, { flow: 'all' }), check: ({ q }) => expect(q.flow).toBe('all'), warns: [] },
  { rule: 'other missing on single → on', input: one({}), check: ({ first }) => expect(first.other).toEqual({}), warns: [] },
  { rule: 'other false → off', input: one({ other: false }), check: ({ first }) => expect(first.other).toBeNull(), warns: [] },
  {
    rule: 'other object keeps its label and placeholder',
    input: one({ other: { label: 'Elsewhere', placeholder: 'Type a place' } }),
    check: ({ first }) => expect(first.other).toEqual({ label: 'Elsewhere', placeholder: 'Type a place' }),
    warns: [],
  },
  { rule: 'other is always off on text', input: one({ type: 'text', options: undefined, other: true }), check: ({ first }) => expect(first.other).toBeNull(), warns: [] },
  { rule: 'required missing → false', input: one({}), check: ({ first }) => expect(first.required).toBe(false), warns: [] },
  { rule: 'label missing → the prompt', input: one({}), check: ({ first }) => expect(first.label).toBe('Pick one'), warns: [] },
  { rule: 'label given is kept', input: one({ label: 'Pick' }), check: ({ first }) => expect(first.label).toBe('Pick'), warns: [] },

  // ── Ids ──
  {
    rule: 'questionnaire id missing → stable hash, warns',
    input: { questions: [{ id: 'a', prompt: 'Pick one', type: 'text' }] },
    check: ({ q }) => expect(q.id).toBe('c' + hash('Pick one')),
    warns: ['questionnaire-id'],
  },
  {
    rule: 'question id missing → from its position',
    input: { id: 't', questions: [{ prompt: 'A', type: 'text' }, { prompt: 'B', type: 'text' }] },
    check: ({ q }) => expect(q.questions.map((x) => x.id)).toEqual(['q1', 'q2']),
    warns: ['question-id', 'question-id'],
  },
  {
    rule: 'question id duplicated → second one renamed',
    input: { id: 't', questions: [{ id: 'x', prompt: 'A', type: 'text' }, { id: 'x', prompt: 'B', type: 'text' }] },
    check: ({ q }) => expect(q.questions.map((x) => x.id)).toEqual(['x', 'q2']),
    warns: ['question-id'],
  },
  {
    rule: 'generated question id never collides with a given one',
    input: { id: 't', questions: [{ id: 'q2', prompt: 'A', type: 'text' }, { prompt: 'B', type: 'text' }] },
    check: ({ q }) => expect(q.questions.map((x) => x.id)).toEqual(['q2', 'q2-2']),
    warns: ['question-id'],
  },
  {
    rule: 'option id missing → slug of the label',
    input: one({ options: [{ label: "Near King's Cross" }, { label: 'Soho' }] }),
    check: ({ first }) => expect(first.options.map((o) => o.id)).toEqual(['near-king-s-cross', 'soho']),
    warns: ['option-id', 'option-id'],
  },
  {
    rule: 'option id duplicated → made unique',
    input: one({ options: [{ id: 'x', label: 'Same' }, { id: 'x', label: 'Same' }] }),
    check: ({ first }) => expect(first.options.map((o) => o.id)).toEqual(['x', 'same']),
    warns: ['option-id'],
  },

  // ── Options ──
  {
    rule: 'more than 9 options → first 9, warns',
    input: one({ options: opts(12) }),
    check: ({ first }) => expect(first.options.map((o) => o.id)).toEqual(opts(9).map((o) => o.id)),
    warns: ['too-many-options'],
  },
  // Boundaries: exactly at the limit, and one past it.
  { rule: 'exactly 9 options → all kept', input: one({ options: opts(9) }), check: ({ first }) => expect(first.options).toHaveLength(9), warns: [] },
  { rule: '10 options → 9, warns', input: one({ options: opts(10) }), check: ({ first }) => expect(first.options).toHaveLength(9), warns: ['too-many-options'] },
  { rule: 'exactly 2 options → fine', input: one({ options: opts(2) }), check: ({ first }) => expect(first.options).toHaveLength(2), warns: [] },
  { rule: 'fewer than 2 options → warns, still renders', input: one({ options: opts(1) }), check: ({ first }) => expect(first.options).toHaveLength(1), warns: ['too-few-options'] },
  {
    rule: 'more than one recommended → keep the first',
    input: one({ options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B', recommended: true }, { id: 'c', label: 'C', recommended: true }] }),
    check: ({ first }) => expect(first.options.map((o) => o.recommended)).toEqual([false, true, false]),
    warns: ['recommended-many'],
  },
  {
    rule: 'a disabled option cannot be recommended',
    input: one({ options: [{ id: 'a', label: 'A', recommended: true, disabled: true }, { id: 'b', label: 'B' }] }),
    check: ({ first }) => expect(first.options[0]).toMatchObject({ recommended: false, disabled: true }),
    warns: ['recommended-disabled'],
  },
  {
    rule: 'option without a label is left out',
    input: one({ options: [{ id: 'a' }, 'nope', ...opts(2)] }),
    check: ({ first }) => expect(first.options.map((o) => o.id)).toEqual(['o1', 'o2']),
    warns: ['option-dropped', 'option-dropped'],
  },
  {
    rule: 'option fields are filled in',
    input: one({ options: [{ id: 'a', label: 'A', description: 'Desc' }, { id: 'b', label: 'B' }] }),
    check: ({ first }) => expect(first.options[0]).toEqual({ id: 'a', label: 'A', description: 'Desc', recommended: false, disabled: false, compose: null }),
    warns: [],
  },
  { rule: 'options on a text question are ignored', input: one({ type: 'text' }), check: ({ first }) => expect(first.options).toEqual([]), warns: ['options-ignored'] },

  // ── Compose ──
  {
    rule: 'compose on single is kept',
    input: one({ other: false, options: [...opts(2), { id: 'c', label: "I'll explain", compose: 'For accessibility, I need ' }] }),
    check: ({ first }) => expect(first.options[2]!.compose).toBe('For accessibility, I need '),
    warns: [],
  },
  {
    rule: 'compose on multi is ignored',
    input: one({ type: 'multi', other: false, options: [...opts(2), { id: 'c', label: 'Explain', compose: 'I need ' }] }),
    check: ({ first }) => expect(first.options.every((o) => o.compose === null)).toBe(true),
    warns: ['compose-multi'],
  },
  {
    rule: 'other + compose on one question → allowed, warns',
    input: one({ options: [...opts(2), { id: 'c', label: 'Explain', compose: 'I need ' }] }),
    check: ({ first }) => expect(first.other).toEqual({}),
    warns: ['compose-and-other'],
  },

  // ── Delegate ──
  { rule: 'delegate missing → false', input: one({}), check: ({ first }) => expect(first.delegate).toBe(false), warns: [] },
  { rule: 'delegate missing → questionnaire default', input: one({}, { delegate: true }), check: ({ first }) => expect(first.delegate).toBe(true), warns: [] },
  { rule: 'question delegate false beats questionnaire default', input: one({ delegate: false }, { delegate: true }), check: ({ first }) => expect(first.delegate).toBe(false), warns: [] },
  { rule: 'required beats delegate on the question, warns', input: one({ required: true, delegate: true }), check: ({ first }) => expect(first.delegate).toBe(false), warns: ['delegate-required'] },
  { rule: 'required beats questionnaire delegate silently', input: one({ required: true }, { delegate: true }), check: ({ first }) => expect(first.delegate).toBe(false), warns: [] },

  // ── min / max ──
  { rule: 'single → min 0, max 1', input: one({}), check: ({ first }) => expect([first.min, first.max]).toEqual([0, 1]), warns: [] },
  { rule: 'text → min 0, max 0', input: one({ type: 'text', options: undefined }), check: ({ first }) => expect([first.min, first.max]).toEqual([0, 0]), warns: [] },
  { rule: 'multi, missing → min 1, max = options + other', input: one({ type: 'multi' }), check: ({ first }) => expect([first.min, first.max]).toEqual([1, 4]), warns: [] },
  { rule: 'multi without other → max = options', input: one({ type: 'multi', other: false }), check: ({ first }) => expect(first.max).toBe(3), warns: [] },
  { rule: 'multi, valid range kept', input: one({ type: 'multi', min: 2, max: 3 }), check: ({ first }) => expect([first.min, first.max]).toEqual([2, 3]), warns: [] },
  { rule: 'multi, max above choices → clamped', input: one({ type: 'multi', other: false, max: 7 }), check: ({ first }) => expect(first.max).toBe(3), warns: ['min-max'] },
  { rule: 'multi, min above max → clamped to max', input: one({ type: 'multi', min: 3, max: 2 }), check: ({ first }) => expect([first.min, first.max]).toEqual([2, 2]), warns: ['min-max'] },
  { rule: 'multi, min 0 → 1 (Skip is the way past with none)', input: one({ type: 'multi', min: 0 }), check: ({ first }) => expect(first.min).toBe(1), warns: ['min-max'] },
  { rule: 'min/max on single → ignored, warns', input: one({ min: 2 }), check: ({ first }) => expect([first.min, first.max]).toEqual([0, 1]), warns: ['min-max'] },

  // ── Defaults ──
  { rule: 'default string on single → array', input: one({ default: 'o2' }), check: ({ first }) => expect(first.default).toEqual(['o2']), warns: [] },
  { rule: 'default unknown → ignored, warns', input: one({ default: 'nope' }), check: ({ first }) => expect(first.default).toEqual([]), warns: ['default'] },
  {
    rule: 'default on a disabled option → ignored',
    input: one({ options: [{ id: 'a', label: 'A', disabled: true }, { id: 'b', label: 'B' }], default: 'a' }),
    check: ({ first }) => expect(first.default).toEqual([]),
    warns: ['default'],
  },
  { rule: 'default on single, two given → first kept', input: one({ default: ['o1', 'o2'] }), check: ({ first }) => expect(first.default).toEqual(['o1']), warns: ['default'] },
  { rule: 'default on multi → trimmed to max', input: one({ type: 'multi', max: 2, default: ['o1', 'o2', 'o3'] }), check: ({ first }) => expect(first.default).toEqual(['o1', 'o2']), warns: ['default'] },
  { rule: 'default on text → the text', input: one({ type: 'text', options: undefined, default: 'For 2 adults' }), check: ({ first }) => expect(first.default).toEqual(['For 2 adults']), warns: [] },
  { rule: 'default on text, array → first', input: one({ type: 'text', options: undefined, default: ['A', 'B'] }), check: ({ first }) => expect(first.default).toEqual(['A']), warns: ['default'] },
  { rule: 'no default → []', input: one({}), check: ({ first }) => expect(first.default).toEqual([]), warns: [] },

  // ── Agent JSON shape ──
  { rule: 'type missing with options → single', input: one({ type: undefined }), check: ({ first }) => expect(first.type).toBe('single'), warns: ['type'] },
  { rule: 'type unknown without options → text', input: one({ type: 'date', options: undefined }), check: ({ first }) => expect(first.type).toBe('text'), warns: ['type'] },
  {
    rule: 'question without a prompt is left out',
    input: { id: 't', questions: [{ id: 'x', type: 'text' }, null, { id: 'y', prompt: 'Kept', type: 'text' }] },
    check: ({ q }) => expect(q.questions.map((x) => x.id)).toEqual(['y']),
    warns: ['question-dropped', 'question-dropped'],
  },
  { rule: 'blank strings count as missing', input: one({ label: '   ', description: '' }), check: ({ first }) => expect([first.label, first.description]).toEqual(['Pick one', undefined]), warns: [] },
  {
    rule: 'display text is passed through',
    input: one({ description: 'Per night' }, { title: 'Before I search', source: 'Claude' }),
    check: ({ q, first }) => expect([q.title, q.source, first.description]).toEqual(['Before I search', 'Claude', 'Per night']),
    warns: [],
  },
];

describe('normalize · BUILD §3.1', () => {
  it.each(cases)('$rule', ({ input, check, warns }) => {
    const r = ok(input);
    check(r);
    expect(r.codes).toEqual(warns);
  });

  it.each([
    ['no questions', { id: 't', questions: [] }],
    ['questions not an array', { id: 't', questions: 'nope' }],
    ['every question unusable', { id: 't', questions: [{ type: 'text' }] }],
    ['not an object', 42],
    ['undefined', undefined],
  ])('refuses when nothing can be shown: %s', (_, input) => {
    const r = normalize(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('empty');
  });
});

describe('helpers', () => {
  it.each([
    ["Near King's Cross", 'near-king-s-cross'],
    ['  $250–400 / night ', '250-400-night'],
    ['Café', 'café'],
    ['مطار', 'مطار'],
    ['!!!', 'option'],
  ])('slug(%j) → %j', (input, out) => expect(slug(input)).toBe(out));

  it('hash is stable and short', () => {
    expect(hash('Pick one')).toBe(hash('Pick one'));
    expect(hash('Pick one')).not.toBe(hash('Pick two'));
    expect(hash('Pick one')).toMatch(/^[0-9a-z]{1,7}$/);
  });

  it('formats a warning for the console', () => {
    expect(formatWarning({ code: 'too-few-options', at: 'questions[0]' })).toBe(
      '[agent-clarifier] questions[0]: too-few-options',
    );
  });
});

describe('round 23: reserved ids', () => {
  it('renames a question id of __proto__, so its answer stays in the result', () => {
    const r = normalize({ questions: [{ id: '__proto__', prompt: 'P?', type: 'text' }] });
    expect(r.ok && r.q.questions[0]!.id).toBe('q1');
    expect(r.warnings.map((w) => w.code)).toContain('question-id');
  });

  it('renames option ids that would pose as the "Something else" or "Decide for me" rows', () => {
    const r = normalize({
      questions: [{ prompt: 'P?', type: 'single', options: [{ id: '__other', label: 'A' }, { id: '__delegate', label: 'B' }] }],
    });
    const ids = r.ok ? r.q.questions[0]!.options.map((o) => o.id) : [];
    expect(ids).not.toContain('__other');
    expect(ids).not.toContain('__delegate');
  });
});
