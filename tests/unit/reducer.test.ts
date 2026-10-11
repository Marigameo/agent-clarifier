import { describe, expect, it } from 'vitest';
import { normalize } from '../../src/model/normalize';
import { HISTORY_LIMIT, initialState, reducer } from '../../src/model/reducer';
import type { Action, ActionType, Env, NormalizedQuestionnaire, State, Status } from '../../src/model/types';

// ── fixtures ─────────────────────────────────────────────────────────────────

const opts = (...ids: string[]) => ids.map((id) => ({ id, label: id[0]!.toUpperCase() + id.slice(1) }));

/** 4 questions, sequential: single · single (delegate) · multi (max 2) · text. 4 ≥ 3, so review shows. */
const TRIP = {
  id: 'trip',
  questions: [
    { id: 'area', prompt: 'Where?', label: 'Area', type: 'single', options: opts('kings', 'soho', 'east') },
    { id: 'budget', prompt: 'Budget?', label: 'Budget', type: 'single', delegate: true, options: opts('low', 'mid', 'high') },
    { id: 'extras', prompt: 'Extras?', label: 'Extras', type: 'multi', max: 2, options: opts('walk', 'quiet', 'breakfast') },
    { id: 'notes', prompt: 'Anything else?', label: 'Notes', type: 'text' },
  ],
};
/** 2 questions: no review by default unless something is skipped. */
const SHORT = { id: 'short', questions: TRIP.questions.slice(0, 2) };

function norm(input: unknown): NormalizedQuestionnaire {
  const r = normalize(input);
  if (!r.ok) throw new Error('fixture did not normalize');
  return r.q;
}

const ENV: Env = { review: 'auto', undoWindow: 0, now: 1000 };

/** Deep-freeze so any mutation inside the reducer throws (ES modules run in strict mode). */
function freeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) freeze(v);
  }
  return o;
}

const run = (s: State, actions: Action[], env: Env = ENV): State =>
  actions.reduce((st, a) => reducer(freeze(st), a, env), s);

const open = (input: unknown = TRIP, env: Env = ENV): State =>
  run(initialState(), [{ type: 'OPEN', q: norm(input), partial: false }], env);

const sel = (questionId: string, optionId: string): Action => ({ type: 'SELECT', questionId, optionId });
const tog = (questionId: string, optionId: string): Action => ({ type: 'TOGGLE', questionId, optionId });
const NEXT: Action = { type: 'NEXT' };
const UNDO: Action = { type: 'UNDO' };

/** TRIP answered step by step → reviewing. */
const FILL: Action[] = [
  sel('area', 'kings'), NEXT,
  sel('budget', 'mid'), NEXT,
  tog('extras', 'walk'), NEXT,
  { type: 'TEXT_INPUT', questionId: 'notes', text: 'Quiet room' }, NEXT,
];
const reviewing = (env: Env = ENV) => run(open(TRIP, env), FILL, env);

/** One state in every status, for the "not allowed here" matrix. */
function inEveryStatus(): Record<Status, State> {
  const r = reviewing();
  const submitting = run(r, [{ type: 'SUBMIT' }]);
  return {
    hidden: initialState(),
    loading: run(initialState(), [{ type: 'OPEN', q: null, partial: true }]),
    answering: open(),
    reviewing: r,
    submitting,
    error: run(submitting, [{ type: 'SUBMIT_FAIL', message: 'Network' }]),
    answered: run(submitting, [{ type: 'SUBMIT_OK' }]),
    minimised: run(open(), [{ type: 'MINIMISE' }]),
    expired: run(open(), [{ type: 'EXPIRE' }]),
  };
}

// ── 1. Allowed-in matrix (BUILD §4.2 "Allowed in" column) ────────────────────

const ALL: Status[] = ['hidden', 'loading', 'answering', 'reviewing', 'submitting', 'answered', 'error', 'minimised', 'expired'];
const ANSWERING: Status[] = ['answering'];

// Typed as Record<ActionType, …>: adding an action without a row here fails to compile.
const ALLOWED: Record<ActionType, { sample: Action; in: Status[] }> = {
  OPEN: { sample: { type: 'OPEN', q: norm(TRIP), partial: false }, in: ['hidden', 'answered', 'expired'] },
  STREAM: { sample: { type: 'STREAM', q: norm(TRIP), partial: false }, in: ['loading'] },
  SELECT: { sample: sel('area', 'soho'), in: ANSWERING },
  TOGGLE: { sample: tog('extras', 'quiet'), in: ANSWERING },
  OTHER_FOCUS: { sample: { type: 'OTHER_FOCUS', questionId: 'area' }, in: ANSWERING },
  OTHER_INPUT: { sample: { type: 'OTHER_INPUT', questionId: 'area', text: 'x' }, in: ANSWERING },
  TEXT_FOCUS: { sample: { type: 'TEXT_FOCUS', questionId: 'notes' }, in: ANSWERING },
  TEXT_INPUT: { sample: { type: 'TEXT_INPUT', questionId: 'notes', text: 'x' }, in: ANSWERING },
  DELEGATE: { sample: { type: 'DELEGATE', questionId: 'budget' }, in: ANSWERING },
  NEXT: { sample: NEXT, in: ANSWERING },
  BACK: { sample: { type: 'BACK' }, in: ['answering', 'reviewing'] },
  GOTO: { sample: { type: 'GOTO', step: 0 }, in: ANSWERING },
  SKIP: { sample: { type: 'SKIP', questionId: 'area' }, in: ANSWERING },
  SKIP_ALL: { sample: { type: 'SKIP_ALL' }, in: ANSWERING },
  EDIT: { sample: { type: 'EDIT', questionId: 'area' }, in: ['reviewing'] },
  START_OVER: { sample: { type: 'START_OVER' }, in: ['reviewing'] },
  UNDO: { sample: UNDO, in: ['answering', 'reviewing'] },
  SUBMIT: { sample: { type: 'SUBMIT' }, in: ['answering', 'reviewing'] },
  UNDO_SUBMIT: { sample: { type: 'UNDO_SUBMIT' }, in: ['submitting'] },
  SUBMIT_OK: { sample: { type: 'SUBMIT_OK' }, in: ['submitting'] },
  SUBMIT_FAIL: { sample: { type: 'SUBMIT_FAIL', message: 'x' }, in: ['submitting'] },
  RETRY: { sample: { type: 'RETRY' }, in: ['error'] },
  MINIMISE: { sample: { type: 'MINIMISE' }, in: ['loading', 'answering', 'reviewing', 'error'] },
  REOPEN: { sample: { type: 'REOPEN' }, in: ['minimised'] },
  COMPOSE: { sample: { type: 'COMPOSE', questionId: 'area', optionId: 'kings' }, in: ANSWERING },
  REPLY: { sample: { type: 'REPLY', text: 'Just go' }, in: ['minimised', 'answering', 'reviewing'] },
  REVISE: { sample: { type: 'REVISE' }, in: ['answered'] },
  EXPIRE: { sample: { type: 'EXPIRE' }, in: ALL.filter((x) => !['hidden', 'answered', 'expired'].includes(x)) },
  RESET: { sample: { type: 'RESET' }, in: ALL },
  TOAST_TIMEOUT: { sample: { type: 'TOAST_TIMEOUT' }, in: ALL },
};

describe('1 · actions do nothing where they are not allowed', () => {
  const states = inEveryStatus();
  const rows = Object.entries(ALLOWED).flatMap(([type, { sample, in: allowed }]) =>
    ALL.filter((st) => !allowed.includes(st)).map((st) => ({ type, status: st, sample })),
  );
  it.each(rows)('$type in $status → same state', ({ status, sample }) => {
    const before = states[status];
    expect(before.status).toBe(status);
    expect(run(before, [sample])).toBe(before);
  });

  it('an unknown action returns the same state', () => {
    const s = open();
    expect(reducer(s, { type: 'NOPE' } as unknown as Action, ENV)).toBe(s);
  });
});

// ── 2. Transitions (BUILD §4.2 "Effect" and "History" columns) ───────────────

describe('2 · OPEN and STREAM', () => {
  it('OPEN → answering with defaults applied, history empty', () => {
    const s = open({ id: 't', questions: [
      { id: 'a', prompt: 'A', type: 'single', options: opts('x', 'y'), default: 'y' },
      { id: 'b', prompt: 'B', type: 'text', default: 'For 2 adults' },
    ] });
    expect(s.status).toBe('answering');
    expect(s.drafts.a!.values).toEqual(['y']);
    expect(s.drafts.b!.text).toBe('For 2 adults');
    expect(s.history).toEqual([]);
  });

  it('OPEN partial → loading, even with no complete question yet', () => {
    expect(run(initialState(), [{ type: 'OPEN', q: null, partial: true }]).status).toBe('loading');
  });

  it('OPEN with no questionnaire and not partial does nothing', () => {
    const s = initialState();
    expect(run(s, [{ type: 'OPEN', q: null, partial: false }])).toBe(s);
  });

  it('OPEN from a record starts fresh', () => {
    const s = run(reviewing(), [{ type: 'SUBMIT' }, { type: 'SUBMIT_OK' }, { type: 'OPEN', q: norm(SHORT), partial: false }]);
    expect(s).toMatchObject({ status: 'answering', record: null, step: 0 });
    expect(s.q!.id).toBe('short');
  });

  it('STREAM partial stays loading; final → answering', () => {
    const loading = run(initialState(), [{ type: 'OPEN', q: null, partial: true }]);
    const more = run(loading, [{ type: 'STREAM', q: norm(SHORT), partial: true }]);
    expect(more.status).toBe('loading');
    expect(run(more, [{ type: 'STREAM', q: norm(TRIP), partial: false }]).status).toBe('answering');
  });

  it('STREAM finishing while minimised → reopen goes to answering', () => {
    const s = run(initialState(), [
      { type: 'OPEN', q: null, partial: true },
      { type: 'MINIMISE' },
      { type: 'STREAM', q: norm(TRIP), partial: false },
    ]);
    expect(s).toMatchObject({ status: 'minimised', resumeTo: 'answering' });
    expect(run(s, [{ type: 'REOPEN' }]).status).toBe('answering');
  });

  it('STREAM final with no questionnaire does nothing', () => {
    const loading = run(initialState(), [{ type: 'OPEN', q: null, partial: true }]);
    expect(run(loading, [{ type: 'STREAM', q: null, partial: false }])).toBe(loading);
  });
});

describe('2 · SELECT', () => {
  it('sets the value, clears other and delegated, pushes history, does not move on by itself', () => {
    const s = run(open(), [{ type: 'OTHER_INPUT', questionId: 'area', text: 'Camden' }, sel('area', 'kings')]);
    expect(s.drafts.area).toMatchObject({ values: ['kings'], other: '', otherActive: false });
    expect(s.history).toHaveLength(1);
    expect(s.step).toBe(0);
  });

  it('picking the same option again changes nothing and adds no undo step', () => {
    const s = run(open(), [sel('area', 'kings')]);
    expect(run(s, [sel('area', 'kings')])).toBe(s);
  });

  it.each([
    ['an unknown option', sel('area', 'nope')],
    ['a multi question', sel('extras', 'walk')],
    ['an unknown question', sel('nope', 'kings')],
  ])('does nothing for %s', (_, action) => {
    const s = open();
    expect(run(s, [action])).toBe(s);
  });

  it('does nothing for a disabled option or a compose option', () => {
    const s = open({ id: 't', questions: [{ id: 'a', prompt: 'A', type: 'single', other: false, options: [
      { id: 'x', label: 'X', disabled: true }, { id: 'y', label: 'Y' }, { id: 'c', label: 'C', compose: 'I need ' },
    ] }] });
    expect(run(s, [sel('a', 'x')])).toBe(s);
    expect(run(s, [sel('a', 'c')])).toBe(s);
  });
});

describe('2 · TOGGLE', () => {
  const atExtras = () => run(open(), [sel('area', 'kings'), NEXT, sel('budget', 'mid'), NEXT]);

  it('adds and removes; picks stay in the options order', () => {
    const s = run(atExtras(), [tog('extras', 'breakfast'), tog('extras', 'walk')]);
    expect(s.drafts.extras!.values).toEqual(['walk', 'breakfast']);
    expect(run(s, [tog('extras', 'breakfast')]).drafts.extras!.values).toEqual(['walk']);
  });

  it('at max: blocked with an "Up to N" toast and no undo step', () => {
    const full = run(atExtras(), [tog('extras', 'walk'), tog('extras', 'quiet')]);
    const s = run(full, [tog('extras', 'breakfast')]);
    expect(s.drafts.extras!.values).toEqual(['walk', 'quiet']);
    expect(s.toast).toEqual({ kind: 'limit', max: 2 });
    expect(s.history).toBe(full.history);
  });

  it('does nothing on a single question or a disabled option', () => {
    const s = open({ id: 't', questions: [{ id: 'm', prompt: 'M', type: 'multi', options: [{ id: 'x', label: 'X', disabled: true }, { id: 'y', label: 'Y' }] }] });
    expect(run(s, [tog('m', 'x')])).toBe(s);
    expect(run(open(), [tog('area', 'kings')]).drafts.area!.values).toEqual([]);
  });
});

describe('2 · Something else (OTHER_FOCUS / OTHER_INPUT)', () => {
  it('a whole typing session is one undo step', () => {
    const picked = run(open(), [sel('area', 'kings')]);
    const typed = run(picked, [
      { type: 'OTHER_FOCUS', questionId: 'area' },
      { type: 'OTHER_INPUT', questionId: 'area', text: 'Cam' },
      { type: 'OTHER_INPUT', questionId: 'area', text: 'Camden' },
    ]);
    expect(typed.drafts.area).toMatchObject({ values: [], other: 'Camden', otherActive: true });
    expect(typed.history).toHaveLength(picked.history.length + 1);
    expect(run(typed, [UNDO]).drafts.area).toMatchObject({ values: ['kings'], other: '' });
  });

  it('"Something else" counts as a pick towards max on multi', () => {
    const s = run(open(), [
      sel('area', 'kings'), NEXT, sel('budget', 'mid'), NEXT,
      tog('extras', 'walk'),
      { type: 'OTHER_FOCUS', questionId: 'extras' },
      { type: 'OTHER_INPUT', questionId: 'extras', text: 'Pool' },
      tog('extras', 'quiet'),
    ]);
    expect(s.drafts.extras!.values).toEqual(['walk']);
    expect(s.toast).toEqual({ kind: 'limit', max: 2 });
  });

  it('entering "Something else" at max on multi is blocked', () => {
    const full = run(open(), [sel('area', 'kings'), NEXT, sel('budget', 'mid'), NEXT, tog('extras', 'walk'), tog('extras', 'quiet')]);
    const s = run(full, [{ type: 'OTHER_FOCUS', questionId: 'extras' }]);
    expect(s.drafts.extras!.otherActive).toBe(false);
    expect(s.toast).toEqual({ kind: 'limit', max: 2 });
  });

  it('does nothing on a question without "Something else"', () => {
    const s = open();
    expect(run(s, [{ type: 'OTHER_FOCUS', questionId: 'notes' }])).toBe(s);
    expect(run(s, [{ type: 'OTHER_INPUT', questionId: 'notes', text: 'x' }])).toBe(s);
  });
});

describe('2 · text questions (TEXT_FOCUS / TEXT_INPUT)', () => {
  const atNotes = () => run(open(), FILL.slice(0, 6));

  it('the first keystroke saves one undo step for the session; undo restores the text before it', () => {
    const s = run(atNotes(), [
      { type: 'TEXT_FOCUS', questionId: 'notes' },
      { type: 'TEXT_INPUT', questionId: 'notes', text: 'Quiet' },
      { type: 'TEXT_INPUT', questionId: 'notes', text: 'Quiet room' },
    ]);
    expect(s.drafts.notes!.text).toBe('Quiet room');
    expect(run(s, [UNDO]).drafts.notes!.text).toBe('');
  });

  it('focusing alone changes nothing, so it adds no undo step and keeps a toast (round 11)', () => {
    const skipped = run(open(), [...FILL.slice(0, 4), { type: 'SKIP', questionId: 'extras' }]);
    expect(skipped.toast).not.toBeNull();
    const focused = run(skipped, [{ type: 'TEXT_FOCUS', questionId: 'notes' }]);
    expect(focused).toBe(skipped);
    // So Undo undoes the skip, not an empty focus step.
    expect(run(focused, [UNDO]).drafts.extras!.skipped).toBe(false);
  });

  it('a new focus starts a new session: the next keystroke saves its own undo step', () => {
    const s = run(atNotes(), [
      { type: 'TEXT_INPUT', questionId: 'notes', text: 'Quiet' },
      { type: 'TEXT_FOCUS', questionId: 'notes' },
      { type: 'TEXT_INPUT', questionId: 'notes', text: 'Quiet room' },
    ]);
    expect(run(s, [UNDO]).drafts.notes!.text).toBe('Quiet');
  });

  it('does nothing on a choice question', () => {
    const s = open();
    expect(run(s, [{ type: 'TEXT_FOCUS', questionId: 'area' }])).toBe(s);
    expect(run(s, [{ type: 'TEXT_INPUT', questionId: 'area', text: 'x' }])).toBe(s);
  });
});

describe('2 · DELEGATE (Decide for me)', () => {
  const atBudget = () => run(open(), [sel('area', 'kings'), NEXT]);

  it('sets delegated and clears any pick', () => {
    const s = run(atBudget(), [sel('budget', 'mid'), { type: 'DELEGATE', questionId: 'budget' }]);
    expect(s.drafts.budget).toMatchObject({ delegated: true, values: [] });
  });

  it('picking an option afterwards replaces it', () => {
    const s = run(atBudget(), [{ type: 'DELEGATE', questionId: 'budget' }, sel('budget', 'low')]);
    expect(s.drafts.budget).toMatchObject({ delegated: false, values: ['low'] });
  });

  it('typing a text answer replaces it', () => {
    const s = open({ id: 't', delegate: true, questions: [{ id: 'n', prompt: 'N', type: 'text' }] });
    const typed = run(s, [{ type: 'DELEGATE', questionId: 'n' }, { type: 'TEXT_INPUT', questionId: 'n', text: 'Hi' }]);
    expect(typed.drafts.n).toMatchObject({ delegated: false, text: 'Hi' });
  });

  it('counts as a complete answer, so NEXT moves on (on multi too)', () => {
    const s = open({ id: 't', delegate: true, questions: [
      { id: 'm', prompt: 'M', type: 'multi', options: opts('a', 'b') },
      { id: 'n', prompt: 'N', type: 'text' },
    ] });
    expect(run(s, [{ type: 'DELEGATE', questionId: 'm' }, NEXT]).step).toBe(1);
  });

  it('all flow: picking it again turns it off; sequential: it stays on', () => {
    const all = open({ ...TRIP, flow: 'all' });
    const twice: Action[] = [{ type: 'DELEGATE', questionId: 'budget' }, { type: 'DELEGATE', questionId: 'budget' }];
    expect(run(all, twice).drafts.budget!.delegated).toBe(false);
    expect(run(atBudget(), twice).drafts.budget!.delegated).toBe(true);
  });

  it('is not available where delegate is off, or on a required question', () => {
    const s = open({ id: 't', questions: [{ id: 'a', prompt: 'A', type: 'single', required: true, delegate: true, options: opts('x', 'y') }] });
    expect(run(s, [{ type: 'DELEGATE', questionId: 'a' }])).toBe(s);
    const plain = open();
    expect(run(plain, [{ type: 'DELEGATE', questionId: 'area' }])).toBe(plain);
  });
});

describe('2 · NEXT', () => {
  it('blocked until the current question is answered, delegated or skipped', () => {
    const s = open();
    expect(run(s, [NEXT])).toBe(s);
    expect(run(s, [sel('area', 'kings'), NEXT]).step).toBe(1);
  });

  it('multi needs at least min picks', () => {
    const s = open({ id: 't', questions: [{ id: 'm', prompt: 'M', type: 'multi', min: 2, options: opts('a', 'b', 'c') }, { id: 'n', prompt: 'N', type: 'text' }] });
    const one = run(s, [tog('m', 'a')]);
    expect(run(one, [NEXT])).toBe(one);
    expect(run(one, [tog('m', 'b'), NEXT]).step).toBe(1);
  });

  it('last step with 3+ questions → review (auto)', () => {
    expect(reviewing().status).toBe('reviewing');
  });

  it('last step, 2 questions, nothing skipped → straight to submitting', () => {
    const s = run(open(SHORT), [sel('area', 'kings'), NEXT, sel('budget', 'mid'), NEXT]);
    expect(s).toMatchObject({ status: 'submitting', resumeTo: 'answering' });
  });

  it('review="always" shows review; review="never" skips it even after a skip', () => {
    const always = { ...ENV, review: 'always' as const };
    expect(run(open(SHORT, always), [sel('area', 'kings'), NEXT, sel('budget', 'mid'), NEXT], always).status).toBe('reviewing');
    const never = { ...ENV, review: 'never' as const };
    const s = run(open({ id: 't', questions: [TRIP.questions[0], TRIP.questions[3]] }, never), [{ type: 'SKIP', questionId: 'area' }, { type: 'TEXT_INPUT', questionId: 'notes', text: 'Hi' }, NEXT], never);
    expect(s.status).toBe('submitting');
  });

  it('after an edit from review, Continue goes back to review', () => {
    const s = run(reviewing(), [{ type: 'EDIT', questionId: 'area' }, sel('area', 'soho'), NEXT]);
    expect(s).toMatchObject({ status: 'reviewing', returnTo: null });
    expect(s.drafts.area!.values).toEqual(['soho']);
  });

  it('does nothing in the all flow', () => {
    const s = open({ ...TRIP, flow: 'all' });
    expect(run(s, [sel('area', 'kings'), NEXT]).step).toBe(0);
  });
});

describe('2 · BACK and GOTO (navigation never changes answers or history)', () => {
  it('BACK goes one step back with the old answer still selected', () => {
    const fwd = run(open(), [sel('area', 'kings'), NEXT]);
    const back = run(fwd, [{ type: 'BACK' }]);
    expect(back.step).toBe(0);
    expect(back.drafts).toBe(fwd.drafts);
    expect(back.history).toBe(fwd.history);
  });

  it('BACK at the first step does nothing', () => {
    const s = open();
    expect(run(s, [{ type: 'BACK' }])).toBe(s);
  });

  it('BACK from review → the last step', () => {
    expect(run(reviewing(), [{ type: 'BACK' }])).toMatchObject({ status: 'answering', step: 3 });
  });

  it('BACK does nothing in the all flow', () => {
    const s = open({ ...TRIP, flow: 'all' });
    expect(run(s, [{ type: 'BACK' }])).toBe(s);
  });

  it('GOTO jumps to a settled step only', () => {
    const s = run(open(), [sel('area', 'kings'), NEXT, sel('budget', 'mid'), NEXT]);
    expect(run(s, [{ type: 'GOTO', step: 0 }]).step).toBe(0);
    const back = run(s, [{ type: 'GOTO', step: 0 }]);
    expect(run(back, [{ type: 'GOTO', step: 3 }])).toBe(back);
    expect(run(s, [{ type: 'GOTO', step: 2 }])).toBe(s);
    expect(run(s, [{ type: 'GOTO', step: 9 }])).toBe(s);
  });
});

describe('2 · SKIP and SKIP_ALL', () => {
  it('SKIP marks it skipped, clears its picks, shows a toast and moves on', () => {
    const s = run(open(), [sel('area', 'kings'), { type: 'SKIP', questionId: 'area' }]);
    expect(s.drafts.area).toMatchObject({ skipped: true, values: [] });
    expect(s.toast).toEqual({ kind: 'skipped', questionId: 'area' });
    expect(s.step).toBe(1);
  });

  it('SKIP is not offered on required or delegate questions', () => {
    const req = open({ id: 't', questions: [{ id: 'a', prompt: 'A', type: 'single', required: true, options: opts('x', 'y') }] });
    expect(run(req, [{ type: 'SKIP', questionId: 'a' }])).toBe(req);
    const atBudget = run(open(), [sel('area', 'kings'), NEXT]);
    expect(run(atBudget, [{ type: 'SKIP', questionId: 'budget' }])).toBe(atBudget);
  });

  it('SKIP in the all flow marks it without moving', () => {
    const s = run(open({ ...TRIP, flow: 'all' }), [{ type: 'SKIP', questionId: 'extras' }]);
    expect(s.drafts.extras!.skipped).toBe(true);
    expect(s.step).toBe(0);
  });

  it('skipping every question finishes as skipped, with no review (= Skip all)', () => {
    const qs = { id: 't', questions: [TRIP.questions[0], TRIP.questions[2], TRIP.questions[3]] };
    const s = run(open(qs), [
      { type: 'SKIP', questionId: 'area' }, { type: 'SKIP', questionId: 'extras' }, { type: 'SKIP', questionId: 'notes' },
    ]);
    expect(s.status).toBe('answered');
    expect(s.record).toMatchObject({ kind: 'skipped', result: { status: 'skipped' } });
  });

  it('SKIP_ALL (all flow) → skipped record with every answer skipped', () => {
    const s = run(open({ ...TRIP, flow: 'all' }), [sel('area', 'kings'), { type: 'SKIP_ALL' }]);
    expect(s.record!.kind).toBe('skipped');
    expect(Object.values(s.record!.result.answers).every((x) => x.status === 'skipped')).toBe(true);
    expect(s.history).toEqual([]);
  });

  it('SKIP_ALL does nothing in sequential, or when a question is required', () => {
    const seq = open();
    expect(run(seq, [{ type: 'SKIP_ALL' }])).toBe(seq);
    const req = open({ id: 't', flow: 'all', questions: [{ id: 'a', prompt: 'A', type: 'text', required: true }] });
    expect(run(req, [{ type: 'SKIP_ALL' }])).toBe(req);
  });
});

describe('2 · EDIT and START_OVER', () => {
  it('EDIT goes to that step and remembers to come back', () => {
    expect(run(reviewing(), [{ type: 'EDIT', questionId: 'extras' }])).toMatchObject({ status: 'answering', step: 2, returnTo: 'review' });
  });

  it('EDIT of an unknown question does nothing', () => {
    const r = reviewing();
    expect(run(r, [{ type: 'EDIT', questionId: 'nope' }])).toBe(r);
  });

  it('START_OVER clears to the defaults, goes to step 0, and can be undone', () => {
    const r = reviewing();
    const s = run(r, [{ type: 'START_OVER' }]);
    expect(s).toMatchObject({ status: 'answering', step: 0, toast: { kind: 'cleared' } });
    expect(s.drafts.area!.values).toEqual([]);
    const undone = run(s, [UNDO]);
    expect(undone.status).toBe('reviewing');
    expect(undone.drafts).toEqual(r.drafts);
  });
});

describe('2 · UNDO', () => {
  it('with nothing to undo, does nothing', () => {
    const s = open();
    expect(run(s, [UNDO])).toBe(s);
  });

  it('history is capped at 50', () => {
    const many: Action[] = Array.from({ length: 60 }, (_, i) => sel('area', i % 2 ? 'kings' : 'soho'));
    expect(run(open(), many).history).toHaveLength(HISTORY_LIMIT);
  });
});

describe('2 · SUBMIT, the undo window, and the outcome', () => {
  it('all flow: missing required → attempted, stays; asking again changes nothing', () => {
    const s = open({ id: 't', flow: 'all', questions: [{ id: 'a', prompt: 'A', type: 'text', required: true }, { id: 'b', prompt: 'B', type: 'text' }] });
    const tried = run(s, [{ type: 'SUBMIT' }]);
    expect(tried).toMatchObject({ status: 'answering', attempted: true });
    expect(run(tried, [{ type: 'SUBMIT' }])).toBe(tried);
  });

  it('all flow: picks below min block the send', () => {
    const s = open({ id: 't', flow: 'all', questions: [{ id: 'm', prompt: 'M', type: 'multi', min: 2, options: opts('a', 'b', 'c') }] });
    expect(run(s, [tog('m', 'a'), { type: 'SUBMIT' }]).attempted).toBe(true);
  });

  it('all flow: valid → submitting; unanswered optional questions count as skipped', () => {
    const s = run(open({ ...TRIP, flow: 'all' }), [sel('area', 'kings'), { type: 'SUBMIT' }]);
    expect(s).toMatchObject({ status: 'submitting', resumeTo: 'answering', undoUntil: null });
    const done = run(s, [{ type: 'SUBMIT_OK' }]);
    expect(done.record!.result.answers.extras!.status).toBe('skipped');
  });

  it('all flow: nothing answered → finishes as skipped', () => {
    expect(run(open({ ...TRIP, flow: 'all' }), [{ type: 'SUBMIT' }]).record!.kind).toBe('skipped');
  });

  it('sequential: SUBMIT before the last step does nothing', () => {
    const s = open();
    expect(run(s, [{ type: 'SUBMIT' }])).toBe(s);
  });

  it('undo window: sets a deadline from env.now; UNDO_SUBMIT works only before it', () => {
    const env = { ...ENV, undoWindow: 4000 };
    const s = run(reviewing(env), [{ type: 'SUBMIT' }], env);
    expect(s.undoUntil).toBe(5000);
    expect(run(s, [{ type: 'UNDO_SUBMIT' }], { ...env, now: 4999 }).status).toBe('reviewing');
    expect(run(s, [{ type: 'UNDO_SUBMIT' }], { ...env, now: 5000 })).toBe(s);
  });

  it('without an undo window, UNDO_SUBMIT does nothing', () => {
    const s = run(reviewing(), [{ type: 'SUBMIT' }]);
    expect(run(s, [{ type: 'UNDO_SUBMIT' }])).toBe(s);
  });

  it('SUBMIT_OK → answered record, history cleared', () => {
    const s = run(reviewing(), [{ type: 'SUBMIT' }, { type: 'SUBMIT_OK' }]);
    expect(s).toMatchObject({ status: 'answered', history: [], record: { kind: 'answered', result: { status: 'submitted', delivery: 'card' } } });
  });

  it('SUBMIT_FAIL keeps every answer; RETRY sends again', () => {
    const r = reviewing();
    const failed = run(r, [{ type: 'SUBMIT' }, { type: 'SUBMIT_FAIL', message: 'Network' }]);
    expect(failed).toMatchObject({ status: 'error', error: 'Network' });
    expect(failed.drafts).toBe(r.drafts);
    expect(run(failed, [{ type: 'RETRY' }])).toMatchObject({ status: 'submitting', error: null });
  });
});

describe('2 · MINIMISE, REOPEN, COMPOSE, REPLY', () => {
  it('MINIMISE keeps the draft and the step; REOPEN returns exactly there', () => {
    const s = run(open(), [sel('area', 'kings'), NEXT, sel('budget', 'mid'), { type: 'MINIMISE' }]);
    expect(s).toMatchObject({ status: 'minimised', resumeTo: 'answering', step: 1 });
    const back = run(s, [{ type: 'REOPEN' }]);
    expect(back).toMatchObject({ status: 'answering', step: 1, resumeTo: null });
    expect(back.drafts.budget!.values).toEqual(['mid']);
  });

  it('MINIMISE from review or error comes back to the same place', () => {
    expect(run(reviewing(), [{ type: 'MINIMISE' }, { type: 'REOPEN' }]).status).toBe('reviewing');
    const err = run(reviewing(), [{ type: 'SUBMIT' }, { type: 'SUBMIT_FAIL', message: 'x' }]);
    expect(run(err, [{ type: 'MINIMISE' }, { type: 'REOPEN' }]).status).toBe('error');
  });

  const COMPOSE_Q = { id: 't', questions: [
    { id: 'access', prompt: 'Access needs?', type: 'single', other: false, options: [
      { id: 'none', label: 'None' }, { id: 'explain', label: "I'll explain", compose: 'For accessibility, I need ' },
    ] },
    { id: 'n', prompt: 'N', type: 'text' },
  ] };

  it('COMPOSE records the pick, minimises, and remembers the sentence', () => {
    const s = run(open(COMPOSE_Q), [{ type: 'COMPOSE', questionId: 'access', optionId: 'explain' }]);
    expect(s).toMatchObject({ status: 'minimised', resumeTo: 'answering', compose: { questionId: 'access', text: 'For accessibility, I need ' } });
    expect(s.drafts.access!.values).toEqual(['explain']);
    expect(run(s, [{ type: 'REOPEN' }])).toMatchObject({ status: 'answering', step: 0, compose: null });
  });

  it('COMPOSE does nothing on a normal option', () => {
    const s = open(COMPOSE_Q);
    expect(run(s, [{ type: 'COMPOSE', questionId: 'access', optionId: 'none' }])).toBe(s);
  });

  it('REPLY → replied record with the trimmed message and the picks so far', () => {
    const s = run(open(), [sel('area', 'kings'), NEXT, { type: 'MINIMISE' }, { type: 'REPLY', text: '  Somewhere quiet, under £300  ' }]);
    expect(s.status).toBe('answered');
    expect(s.record).toMatchObject({ kind: 'replied', result: { delivery: 'composer', message: 'Somewhere quiet, under £300', status: 'submitted' } });
    expect(s.record!.result.answers.area).toMatchObject({ status: 'answered', values: ['kings'] });
    expect(s.record!.result.answers.budget!.status).toBe('skipped');
  });

  it('REPLY with only spaces does nothing', () => {
    const s = run(open(), [{ type: 'MINIMISE' }]);
    expect(run(s, [{ type: 'REPLY', text: '   ' }])).toBe(s);
  });
});

describe('2 · REVISE, EXPIRE, RESET, TOAST_TIMEOUT', () => {
  const answered = () => run(reviewing(), [{ type: 'SUBMIT' }, { type: 'SUBMIT_OK' }]);

  it('REVISE reopens in review with the answers, flagged as a revision', () => {
    const s = run(answered(), [{ type: 'REVISE' }]);
    expect(s).toMatchObject({ status: 'reviewing', revising: true });
    expect(s.drafts.area!.values).toEqual(['kings']);
  });

  it('REVISE after a skip starts fresh at step 0', () => {
    const skipped = run(open({ ...TRIP, flow: 'all' }), [{ type: 'SKIP_ALL' }]);
    const s = run(skipped, [{ type: 'REVISE' }]);
    expect(s).toMatchObject({ status: 'answering', step: 0, revising: true });
    expect(s.drafts.area!.skipped).toBe(false);
  });

  it('REVISE in the all flow opens the form, not a review', () => {
    const s = run(open({ ...TRIP, flow: 'all' }), [sel('area', 'kings'), { type: 'SUBMIT' }, { type: 'SUBMIT_OK' }, { type: 'REVISE' }]);
    expect(s.status).toBe('answering');
  });

  it('the next send after REVISE clears the revision flag', () => {
    const s = run(answered(), [{ type: 'REVISE' }, { type: 'SUBMIT' }]);
    expect(s.revising).toBe(true);
    expect(run(s, [{ type: 'SUBMIT_OK' }]).revising).toBe(false);
  });

  it('EXPIRE → read-only expired record (result dismissed), with the message', () => {
    const s = run(open(), [sel('area', 'kings'), { type: 'EXPIRE', message: 'Moved on' }]);
    expect(s).toMatchObject({ status: 'expired', record: { kind: 'expired', message: 'Moved on', result: { status: 'dismissed' } } });
  });

  it('EXPIRE while loading with no questions yet still gives a record', () => {
    const s = run(initialState(), [{ type: 'OPEN', q: null, partial: true }, { type: 'EXPIRE' }]);
    expect(s.record).toMatchObject({ kind: 'expired', result: { questionnaireId: '', answers: {} } });
    expect(s.record!.message).toBeUndefined();
  });

  it('RESET → back to hidden with everything cleared', () => {
    expect(run(reviewing(), [{ type: 'RESET' }])).toEqual(initialState());
  });

  it('RESET on a card that is already empty does nothing', () => {
    const s = initialState();
    expect(run(s, [{ type: 'RESET' }])).toBe(s);
  });

  it('TOAST_TIMEOUT clears the toast; with no toast it does nothing', () => {
    const s = run(open(), [{ type: 'SKIP', questionId: 'area' }]);
    expect(run(s, [{ type: 'TOAST_TIMEOUT' }]).toast).toBeNull();
    const quiet = open();
    expect(run(quiet, [{ type: 'TOAST_TIMEOUT' }])).toBe(quiet);
  });

  // Defensive fallbacks: these states can't be reached through actions, but if one ever is,
  // the card should land somewhere usable rather than in an undefined status.
  it('defensive: reopen or undo-send without resumeTo lands in answering', () => {
    const lost = { ...open(), status: 'minimised' as const, resumeTo: null };
    expect(run(lost, [{ type: 'REOPEN' }]).status).toBe('answering');
    const sending = { ...open(), status: 'submitting' as const, resumeTo: null, undoUntil: 9999 };
    expect(run(sending, [{ type: 'UNDO_SUBMIT' }]).status).toBe('answering');
  });

  it('a toast goes away on the next action that changes something, not on a no-op', () => {
    const s = run(open(), [{ type: 'SKIP', questionId: 'area' }]);
    expect(run(s, [{ type: 'GOTO', step: 3 }])).toBe(s); // no-op keeps it
    expect(run(s, [sel('budget', 'mid')]).toast).toBeNull();
  });
});

// ── 3. Recovery (PLAN §6), one scenario per row ──────────────────────────────

describe('3 · recovery: every mistake has a way back', () => {
  it('wrong option, auto-advanced → Back shows the old choice selected', () => {
    const s = run(open(), [sel('area', 'kings'), NEXT, { type: 'BACK' }]);
    expect(s.step).toBe(0);
    expect(s.drafts.area!.values).toEqual(['kings']);
  });

  it('picked "Decide for me", wanted to choose → Back keeps it marked; picking replaces it; Undo restores it', () => {
    const s = run(open(), [sel('area', 'kings'), NEXT, { type: 'DELEGATE', questionId: 'budget' }, NEXT, { type: 'BACK' }]);
    expect(s.drafts.budget!.delegated).toBe(true);
    const picked = run(s, [sel('budget', 'low')]);
    expect(picked.drafts.budget).toMatchObject({ delegated: false, values: ['low'] });
    expect(run(picked, [UNDO]).drafts.budget!.delegated).toBe(true);
  });

  it('skipped by accident → Undo returns to the question with its pick', () => {
    const s = run(open(), [sel('area', 'kings'), { type: 'SKIP', questionId: 'area' }, UNDO]);
    expect(s).toMatchObject({ step: 0, toast: null });
    expect(s.drafts.area).toMatchObject({ skipped: false, values: ['kings'] });
  });

  it('skipped one → review flags it (review shows even with 2 questions)', () => {
    const s = run(open(SHORT), [{ type: 'SKIP', questionId: 'area' }, sel('budget', 'mid'), NEXT]);
    expect(s.status).toBe('reviewing');
  });

  it('start over → Undo brings every answer back', () => {
    const r = reviewing();
    expect(run(r, [{ type: 'START_OVER' }, UNDO]).drafts).toEqual(r.drafts);
  });

  it('minimised by accident → nothing lost, reopen at the exact step', () => {
    const before = run(open(), [sel('area', 'kings'), NEXT, sel('budget', 'mid')]);
    const after = run(before, [{ type: 'MINIMISE' }, { type: 'REOPEN' }]);
    expect(after.step).toBe(before.step);
    expect(after.drafts).toBe(before.drafts);
  });

  it('sent, then noticed a mistake → undo window, and after that Edit answers (REVISE)', () => {
    const env = { ...ENV, undoWindow: 4000 };
    const sending = run(reviewing(env), [{ type: 'SUBMIT' }], env);
    expect(run(sending, [{ type: 'UNDO_SUBMIT' }], env).status).toBe('reviewing');
    const answered = run(sending, [{ type: 'SUBMIT_OK' }], env);
    expect(run(answered, [{ type: 'REVISE' }]).status).toBe('reviewing');
  });

  it('send failed → answers kept, Retry', () => {
    const r = reviewing();
    const s = run(r, [{ type: 'SUBMIT' }, { type: 'SUBMIT_FAIL', message: 'x' }, { type: 'RETRY' }]);
    expect(s.status).toBe('submitting');
    expect(s.drafts).toBe(r.drafts);
  });

  it('picked a compose option by mistake → Reopen comes back on that step', () => {
    const q = { id: 't', questions: [TRIP.questions[0], { id: 'c', prompt: 'C', type: 'single', other: false, options: [{ id: 'x', label: 'X' }, { id: 'w', label: 'Write', compose: 'I need ' }] }] };
    const s = run(open(q), [sel('area', 'kings'), NEXT, { type: 'COMPOSE', questionId: 'c', optionId: 'w' }, { type: 'REOPEN' }]);
    expect(s).toMatchObject({ status: 'answering', step: 1, compose: null });
  });

  it('replied in own words, then wanted to answer properly → Answer the questions (REVISE)', () => {
    const s = run(open(), [sel('area', 'kings'), { type: 'MINIMISE' }, { type: 'REPLY', text: 'Just go' }, { type: 'REVISE' }]);
    expect(s).toMatchObject({ status: 'reviewing', revising: true });
  });

  it('typed in "Something else", changed mind → picking clears it, Undo brings the text back', () => {
    const typed = run(open(), [{ type: 'OTHER_FOCUS', questionId: 'area' }, { type: 'OTHER_INPUT', questionId: 'area', text: 'Camden' }]);
    const picked = run(typed, [sel('area', 'soho')]);
    expect(picked.drafts.area!.other).toBe('');
    expect(run(picked, [UNDO]).drafts.area).toMatchObject({ other: 'Camden', otherActive: true });
  });
});

// ── 4. Result rules (BUILD §3.2) ─────────────────────────────────────────────

describe('4 · the result', () => {
  const resultOf = (actions: Action[], input: unknown = { ...TRIP, flow: 'all' }) =>
    run(open(input), [...actions, { type: 'SUBMIT' }, { type: 'SUBMIT_OK' }]).record!.result;

  it('has one entry per question; unanswered ones are skipped', () => {
    const r = resultOf([sel('area', 'kings')]);
    expect(Object.keys(r.answers)).toEqual(['area', 'budget', 'extras', 'notes']);
    expect(r.answers.notes!.status).toBe('skipped');
    expect(r.questionnaireId).toBe('trip');
  });

  it('labels are the visible labels; "Something else" text is in other and in labels', () => {
    const r = resultOf([tog('extras', 'walk'), { type: 'OTHER_FOCUS', questionId: 'extras' }, { type: 'OTHER_INPUT', questionId: 'extras', text: ' Pool ' }]);
    expect(r.answers.extras).toEqual({ status: 'answered', values: ['walk'], labels: ['Walk', 'Pool'], other: 'Pool' });
  });

  it('a text answer is trimmed, in values and labels', () => {
    const r = resultOf([{ type: 'TEXT_INPUT', questionId: 'notes', text: ' Quiet room ' }]);
    expect(r.answers.notes).toEqual({ status: 'answered', values: ['Quiet room'], labels: ['Quiet room'] });
  });

  it('a delegated answer has empty values and labels, and counts as an answer', () => {
    const r = resultOf([{ type: 'DELEGATE', questionId: 'budget' }]);
    expect(r.status).toBe('submitted');
    expect(r.answers.budget).toEqual({ status: 'delegated', values: [], labels: [] });
  });

  it('"Something else" focused but left empty counts as nothing', () => {
    const r = resultOf([sel('area', 'kings'), { type: 'OTHER_FOCUS', questionId: 'extras' }]);
    expect(r.answers.extras!.status).toBe('skipped');
  });
});
