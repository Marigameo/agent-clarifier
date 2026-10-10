import { describe, expect, it } from 'vitest';
import { normalize } from '../../src/model/normalize';
import { initialDrafts, initialState } from '../../src/model/reducer';
import {
  anyAnswered,
  buildAnswer,
  buildResult,
  canContinue,
  draftOf,
  emptyDraft,
  isInvalid,
  isSettled,
  needsReview,
  picks,
  progress,
  questionState,
} from '../../src/model/selectors';
import type { Draft, NormalizedQuestion, NormalizedQuestionnaire, State } from '../../src/model/types';

function norm(input: unknown): NormalizedQuestionnaire {
  const r = normalize(input);
  if (!r.ok) throw new Error('fixture did not normalize');
  return r.q;
}

const Q = norm({
  id: 't',
  questions: [
    { id: 's', prompt: 'S', type: 'single', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
    { id: 'm', prompt: 'M', type: 'multi', min: 2, options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }] },
    { id: 't', prompt: 'T', type: 'text', required: true },
  ],
});
const [S, M, T] = Q.questions as [NormalizedQuestion, NormalizedQuestion, NormalizedQuestion];
const d = (over: Partial<Draft> = {}): Draft => ({ ...emptyDraft(), ...over });
const state = (drafts: Record<string, Draft> = initialDrafts(Q), over: Partial<State> = {}): State => ({
  ...initialState(),
  status: 'answering',
  q: Q,
  drafts,
  ...over,
});

describe('picks and questionState', () => {
  it.each([
    ['single, nothing', S, d(), 0, 'unanswered'],
    ['single, one pick', S, d({ values: ['a'] }), 1, 'answered'],
    ['single, "Something else" with text', S, d({ otherActive: true, other: 'Elsewhere' }), 1, 'answered'],
    ['single, "Something else" blank', S, d({ otherActive: true, other: '  ' }), 0, 'unanswered'],
    ['single, text left behind but field not active', S, d({ other: 'old' }), 0, 'unanswered'],
    ['multi, below min', M, d({ values: ['a'] }), 1, 'unanswered'],
    ['multi, at min', M, d({ values: ['a', 'b'] }), 2, 'answered'],
    ['multi, option + other reach min', M, d({ values: ['a'], otherActive: true, other: 'x' }), 2, 'answered'],
    ['text, blank', T, d({ text: '  ' }), 0, 'unanswered'],
    ['text, written', T, d({ text: 'Hi' }), 1, 'answered'],
    ['delegated wins over anything', S, d({ delegated: true, values: ['a'] }), 1, 'delegated'],
    ['skipped', S, d({ skipped: true }), 0, 'skipped'],
  ] as const)('%s', (_, q, draft, n, st) => {
    expect(picks(q, draft)).toBe(n);
    expect(questionState(q, draft)).toBe(st);
  });
});

describe('canContinue, isSettled, isInvalid', () => {
  it.each([
    ['answered', S, d({ values: ['a'] }), true, true, false],
    ['delegated', S, d({ delegated: true }), true, true, false],
    ['skipped', S, d({ skipped: true }), false, true, false],
    ['empty optional', S, d(), false, false, false],
    ['multi below min', M, d({ values: ['a'] }), false, false, true],
    ['multi below min but skipped', M, d({ values: ['a'], skipped: true }), false, true, false],
    ['required and empty', T, d(), false, false, true],
    ['required and answered', T, d({ text: 'x' }), true, true, false],
  ] as const)('%s', (_, q, draft, cont, settled, invalid) => {
    expect(canContinue(q, draft)).toBe(cont);
    expect(isSettled(q, draft)).toBe(settled);
    expect(isInvalid(q, draft)).toBe(invalid);
  });
});

describe('needsReview', () => {
  const two = norm({ id: 'x', questions: [{ id: 'a', prompt: 'A', type: 'text' }, { id: 'b', prompt: 'B', type: 'text' }] });
  const answeredTwo: State = { ...state(), q: two, drafts: { a: d({ text: '1' }), b: d({ text: '2' }) } };

  it('auto: exactly 3 questions, all answered → yes (the boundary)', () => {
    const all = { s: d({ values: ['a'] }), m: d({ values: ['a', 'b'] }), t: d({ text: 'x' }) };
    expect(Q.questions).toHaveLength(3);
    expect(needsReview(state(all), 'auto')).toBe(true);
  });
  it('auto: 2 questions, all answered → no', () => expect(needsReview(answeredTwo, 'auto')).toBe(false));
  it('auto: 2 questions, one skipped → yes', () =>
    expect(needsReview({ ...answeredTwo, drafts: { a: d({ text: '1' }), b: d({ skipped: true }) } }, 'auto')).toBe(true));
  it('auto: a delegated answer does not count as skipped', () =>
    expect(needsReview({ ...answeredTwo, drafts: { a: d({ text: '1' }), b: d({ delegated: true }) } }, 'auto')).toBe(false));
  it('always → yes, never → no', () => {
    expect(needsReview(answeredTwo, 'always')).toBe(true);
    expect(needsReview(state(), 'never')).toBe(false);
  });
  it('no questionnaire → no', () => expect(needsReview(initialState(), 'auto')).toBe(false));
});

describe('progress and anyAnswered', () => {
  it('counts answered and delegated, not skipped', () => {
    const s = state({ s: d({ values: ['a'] }), m: d({ delegated: true }), t: d({ skipped: true }) }, { step: 2 });
    expect(progress(s)).toEqual({ step: 2, answered: 2, total: 3 });
    expect(anyAnswered(s)).toBe(true);
  });

  it('nothing answered', () => expect(anyAnswered(state())).toBe(false));

  it('no questionnaire → zeros', () => {
    expect(progress(initialState())).toEqual({ step: 0, answered: 0, total: 0 });
    expect(anyAnswered(initialState())).toBe(false);
  });
});

describe('draftOf, buildAnswer, buildResult', () => {
  it('a missing draft reads as empty', () => expect(draftOf(state({}), 's')).toEqual(emptyDraft()));

  it('an unknown option id falls back to the id as its label', () =>
    expect(buildAnswer(S, d({ values: ['zzz'] })).labels).toEqual(['zzz']));

  it('a reply is delivered by the composer with its message', () => {
    const r = buildResult(state(), 'submitted', 'Just go');
    expect(r).toMatchObject({ delivery: 'composer', message: 'Just go' });
  });

  it('a card result has no message field at all', () => {
    expect('message' in buildResult(state(), 'submitted')).toBe(false);
  });

  it('no questionnaire → empty id and answers', () =>
    expect(buildResult(initialState(), 'dismissed')).toEqual({ questionnaireId: '', status: 'dismissed', delivery: 'card', answers: {} }));
});
