import { describe, expect, it } from 'vitest';
import { fromClaude, toClaude, type AskUserQuestionInput } from '../../src/adapters/claude';
import { fromElicitation, toElicitation, type ElicitParams } from '../../src/adapters/mcp';
import { normalize } from '../../src/model/normalize';
import { initialState, reducer } from '../../src/model/reducer';
import type { Action, ClarifyResult, Questionnaire } from '../../src/model/types';

const ENV = { review: 'never' as const, undoWindow: 0, now: 0 };

/** Open a questionnaire in the real model, run actions, and return the result it produces. */
function answer(q: Questionnaire, actions: Action[]): ClarifyResult {
  const r = normalize(q);
  if (!r.ok) throw new Error('did not normalize');
  expect(r.warnings).toEqual([]);
  let s = reducer(initialState(), { type: 'OPEN', q: r.q, partial: false }, ENV);
  for (const a of actions) s = reducer(s, a, ENV);
  if (s.status === 'submitting') s = reducer(s, { type: 'SUBMIT_OK' }, ENV);
  return s.record!.result;
}

// ── Claude ───────────────────────────────────────────────────────────────────

const CLAUDE: AskUserQuestionInput = {
  questions: [
    {
      question: 'Which library should we use for dates?',
      header: 'Library',
      multiSelect: false,
      options: [
        { label: 'date-fns (Recommended)', description: 'Small, tree-shakeable' },
        { label: 'Luxon', description: 'Time zones built in' },
      ],
    },
    {
      question: 'Which features do you want?',
      header: 'Features',
      multiSelect: true,
      options: [
        { label: 'Dark mode', description: '' },
        { label: 'Offline', description: 'Works without a connection', preview: '<b>x</b>' },
        { label: 'Sync', description: 'Across devices' },
      ],
    },
  ],
};

describe('fromClaude', () => {
  const q = fromClaude(CLAUDE);

  it('maps questions: header → label, multiSelect → type, adds "Other"', () => {
    expect(q.questions.map((x) => [x.id, x.label, x.type, x.other])).toEqual([
      ['library', 'Library', 'single', true],
      ['features', 'Features', 'multi', true],
    ]);
    expect(q.questions[0]!.prompt).toBe('Which library should we use for dates?');
  });

  it('strips "(Recommended)" into the recommended flag, and drops previews', () => {
    expect(q.questions[0]!.options![0]).toEqual({ id: 'date-fns', label: 'date-fns', description: 'Small, tree-shakeable', recommended: true });
    expect(q.questions[1]!.options!.some((o) => 'preview' in o)).toBe(false);
  });

  it('has a stable id from the question texts', () => {
    expect(fromClaude(CLAUDE).id).toBe(q.id);
    expect(fromClaude({ questions: CLAUDE.questions.slice(1) }).id).not.toBe(q.id);
  });

  it('can turn on Decide for me and name the source', () => {
    expect(fromClaude(CLAUDE, { delegate: true, source: 'Claude' })).toMatchObject({ delegate: true, source: 'Claude' });
  });
});

describe('toClaude', () => {
  const q = fromClaude(CLAUDE);

  it('answers keyed by question text, values in the original labels, multi joined with ", "', () => {
    const result = answer(q, [
      { type: 'SELECT', questionId: 'library', optionId: 'date-fns' },
      { type: 'NEXT' },
      { type: 'TOGGLE', questionId: 'features', optionId: 'sync' },
      { type: 'TOGGLE', questionId: 'features', optionId: 'dark-mode' },
      { type: 'NEXT' },
    ]);
    expect(toClaude(result, CLAUDE)).toEqual({
      behavior: 'allow',
      updatedInput: {
        questions: CLAUDE.questions,
        answers: {
          'Which library should we use for dates?': 'date-fns (Recommended)',
          'Which features do you want?': 'Dark mode, Sync',
        },
      },
    });
  });

  it('"Something else" sends the typed text, never the word "Other"', () => {
    const result = answer(q, [
      { type: 'OTHER_INPUT', questionId: 'library', text: 'Temporal' },
      { type: 'NEXT' },
      { type: 'SKIP', questionId: 'features' },
    ]);
    const out = toClaude(result, CLAUDE);
    expect(out.behavior === 'allow' && out.updatedInput.answers).toEqual({ 'Which library should we use for dates?': 'Temporal' });
  });

  it('Decide for me sends an instruction as that answer', () => {
    const result = answer(fromClaude(CLAUDE, { delegate: true }), [
      { type: 'DELEGATE', questionId: 'library' },
      { type: 'NEXT' },
      { type: 'DELEGATE', questionId: 'features' },
      { type: 'NEXT' },
    ]);
    const out = toClaude(result, CLAUDE);
    expect(out.behavior === 'allow' && out.updatedInput.answers['Which library should we use for dates?']).toBe(
      'Up to you. Pick what fits and say what you chose.',
    );
  });

  it('skipping everything sends a response in the user’s voice', () => {
    const result = answer(q, [{ type: 'SKIP', questionId: 'library' }, { type: 'SKIP', questionId: 'features' }]);
    expect(result.status).toBe('skipped');
    const out = toClaude(result, CLAUDE, { skipMessage: 'Just go.' });
    expect(out).toMatchObject({ behavior: 'allow', updatedInput: { answers: {}, response: 'Just go.' } });
  });

  it('a reply in the user’s own words becomes the response, carrying any picks with it', () => {
    const result = answer(q, [
      { type: 'SELECT', questionId: 'library', optionId: 'luxon' },
      { type: 'MINIMISE' },
      { type: 'REPLY', text: 'Whatever is smallest' },
    ]);
    const out = toClaude(result, CLAUDE);
    expect(out.behavior === 'allow' && out.updatedInput.response).toBe('Whatever is smallest\n\n(Picked so far: Library: Luxon)');
  });

  it('an expired card is a deny with a message', () => {
    const result = answer(q, [{ type: 'EXPIRE' }]);
    expect(toClaude(result, CLAUDE)).toEqual({ behavior: 'deny', message: 'The user closed the questions without answering.' });
  });
});

// ── MCP ──────────────────────────────────────────────────────────────────────

const MCP: ElicitParams = {
  message: 'Book a table',
  requestedSchema: {
    type: 'object',
    properties: {
      size: { type: 'integer', title: 'Party size', description: 'How many people?', minimum: 1 },
      seating: { type: 'string', title: 'Seating', oneOf: [{ const: 'in', title: 'Inside' }, { const: 'out', title: 'Terrace' }], default: 'in' },
      time: { type: 'string', title: 'Time', enum: ['19', '20'], enumNames: ['7 pm', '8 pm'] },
      diet: { type: 'array', title: 'Dietary', items: { anyOf: [{ const: 'vg', title: 'Vegan' }, { const: 'gf', title: 'Gluten-free' }] }, maxItems: 2 },
      tags: { type: 'array', items: { type: 'string', enum: ['quiet', 'view'] } },
      highchair: { type: 'boolean', title: 'High chair', default: false },
      note: { type: 'string', title: 'Note' },
    },
    required: ['size', 'time'],
  },
};

describe('fromElicitation', () => {
  const q = fromElicitation(MCP, { source: 'restaurant-mcp' })!;
  const by = (id: string) => q.questions.find((x) => x.id === id)!;

  it('reads every schema shape in the 2026-07-28 spec', () => {
    expect(q).toMatchObject({ title: 'Book a table', flow: 'all', source: 'restaurant-mcp' });
    expect(by('size')).toMatchObject({ type: 'text', prompt: 'How many people?', label: 'Party size', required: true, other: false });
    expect(by('seating')).toMatchObject({ type: 'single', default: 'in', options: [{ id: 'in', label: 'Inside' }, { id: 'out', label: 'Terrace' }] });
    expect(by('time').options).toEqual([{ id: '19', label: '7 pm' }, { id: '20', label: '8 pm' }]);
    expect(by('diet')).toMatchObject({ type: 'multi', max: 2, options: [{ id: 'vg', label: 'Vegan' }, { id: 'gf', label: 'Gluten-free' }] });
    expect(by('tags').options).toEqual([{ id: 'quiet', label: 'quiet' }, { id: 'view', label: 'view' }]);
    expect(by('highchair')).toMatchObject({ type: 'single', default: 'false', options: [{ id: 'true', label: 'Yes' }, { id: 'false', label: 'No' }] });
    expect(by('note').type).toBe('text');
  });

  it('URL mode and a missing schema are not forms', () => {
    expect(fromElicitation({ mode: 'url', message: 'Sign in', url: 'https://x' })).toBeNull();
    expect(fromElicitation({ message: 'x' })).toBeNull();
  });
});

describe('toElicitation', () => {
  const q = fromElicitation(MCP)!;

  it('accept, with content typed back from the schema', () => {
    const result = answer(q, [
      { type: 'TEXT_INPUT', questionId: 'size', text: '4' },
      { type: 'SELECT', questionId: 'time', optionId: '20' },
      { type: 'TOGGLE', questionId: 'diet', optionId: 'gf' },
      { type: 'SELECT', questionId: 'highchair', optionId: 'true' },
      { type: 'SUBMIT' },
    ]);
    expect(toElicitation(result, MCP)).toEqual({
      action: 'accept',
      content: { size: 4, seating: 'in', time: '20', diet: ['gf'], highchair: true },
    });
  });

  it('skip → decline, expired → cancel', () => {
    expect(toElicitation(answer(q, [{ type: 'EXPIRE' }]), MCP)).toEqual({ action: 'cancel' });
    const skip = { ...answer(q, [{ type: 'EXPIRE' }]), status: 'skipped' as const };
    expect(toElicitation(skip, MCP)).toEqual({ action: 'decline' });
  });

  it('a reply in own words: accept if every required field has an answer, else decline', () => {
    const partial = answer(q, [{ type: 'SELECT', questionId: 'time', optionId: '19' }, { type: 'MINIMISE' }, { type: 'REPLY', text: 'Call me' }]);
    expect(toElicitation(partial, MCP)).toEqual({ action: 'decline' });
    const full = answer(q, [
      { type: 'TEXT_INPUT', questionId: 'size', text: '2' },
      { type: 'SELECT', questionId: 'time', optionId: '19' },
      { type: 'MINIMISE' },
      { type: 'REPLY', text: 'Window seat if possible' },
    ]);
    expect(toElicitation(full, MCP)).toMatchObject({ action: 'accept', content: { size: 2, time: '19' } });
  });

  it('a "number" that isn’t one is never sent as NaN: required → decline, optional → left out', () => {
    const result = answer(q, [{ type: 'TEXT_INPUT', questionId: 'size', text: 'four' }, { type: 'SELECT', questionId: 'time', optionId: '19' }, { type: 'SUBMIT' }]);
    expect(toElicitation(result, MCP)).toEqual({ action: 'decline' });
    const optional: ElicitParams = { ...MCP, requestedSchema: { ...MCP.requestedSchema!, required: ['time'] } };
    // Defaults count as answers (seating 'in', high chair false), as the spec says to pre-fill them.
    expect(toElicitation(result, optional)).toEqual({ action: 'accept', content: { seating: 'in', time: '19', highchair: false } });
  });
});
