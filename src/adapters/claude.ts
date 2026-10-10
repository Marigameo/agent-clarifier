// Claude's AskUserQuestion tool ↔ the native format (BUILD §6.5).
// Format checked against the Claude Agent SDK docs and sdk-tools.d.ts (Oct 2026):
//   input:  { questions: [{ question, header, options: [{ label, description, preview? }], multiSelect }] }
//   answer: canUseTool returns { behavior: 'allow', updatedInput: { questions, answers, response? } }
//           answers are keyed by the question text; values are option labels (multi: ", "-joined),
//           or the user's own text for "Other". `response` replaces the answer list with
//           "The user responded: …".
//
//   const result = await ask(fromClaude(input), { container, transcript });
//   return toClaude(result, input);

import { claim, hash, slug } from '../model/ids';
import type { ClarifyResult, Questionnaire } from '../model/types';

export interface ClaudeOption {
  label: string;
  description?: string;
  preview?: string;
}
export interface ClaudeQuestion {
  question: string;
  header: string;
  options: ClaudeOption[];
  multiSelect: boolean;
}
export interface AskUserQuestionInput {
  questions: ClaudeQuestion[];
  [key: string]: unknown;
}

export type ClaudePermissionResult =
  | { behavior: 'allow'; updatedInput: { questions: ClaudeQuestion[]; answers: Record<string, string>; response?: string } }
  | { behavior: 'deny'; message: string };

// A widely used convention (not in the official docs): the suggested option's label ends with this.
const RECOMMENDED = /\s*\(recommended\)\s*$/i;

/** Stable ids, so toClaude can map answers back to the original labels. */
function ids(input: AskUserQuestionInput): { qid: string[]; oid: string[][] } {
  const usedQ = new Set<string>();
  return {
    qid: input.questions.map((q, i) => claim(q.header ? slug(q.header) : `q${i + 1}`, usedQ)),
    oid: input.questions.map((q) => {
      const used = new Set<string>();
      return q.options.map((o) => claim(slug(o.label.replace(RECOMMENDED, '')), used));
    }),
  };
}

export function fromClaude(input: AskUserQuestionInput, opts: { delegate?: boolean; source?: string } = {}): Questionnaire {
  const { qid, oid } = ids(input);
  return {
    id: 'c' + hash(input.questions.map((q) => q.question).join('\n')),
    ...(opts.source ? { source: opts.source } : {}),
    ...(opts.delegate ? { delegate: true } : {}),
    questions: input.questions.map((q, i) => ({
      id: qid[i]!,
      prompt: q.question,
      label: q.header || q.question,
      type: q.multiSelect ? 'multi' : 'single',
      // Claude adds no "Other" option; the UI is expected to offer free text itself.
      other: true,
      options: q.options.map((o, j) => ({
        id: oid[i]![j]!,
        label: o.label.replace(RECOMMENDED, ''),
        ...(o.description ? { description: o.description } : {}),
        ...(RECOMMENDED.test(o.label) ? { recommended: true } : {}),
      })),
    })),
  };
}

export interface ToClaudeOptions {
  /** Sent when the user skipped everything. Written as the user, since Claude reads "The user responded: …". */
  skipMessage?: string;
  /** The answer for a question the user handed back with "Decide for me". */
  delegateMessage?: string;
  /** Sent as a deny when the card expired without an answer. */
  dismissMessage?: string;
}

export function toClaude(result: ClarifyResult, input: AskUserQuestionInput, opts: ToClaudeOptions = {}): ClaudePermissionResult {
  if (result.status === 'dismissed') {
    return { behavior: 'deny', message: opts.dismissMessage ?? 'The user closed the questions without answering.' };
  }
  const { qid, oid } = ids(input);
  const answers: Record<string, string> = {};
  const picks: string[] = [];
  input.questions.forEach((q, i) => {
    const a = result.answers[qid[i]!];
    if (!a || a.status === 'skipped') return;
    let value: string;
    if (a.status === 'delegated') value = opts.delegateMessage ?? 'Up to you. Pick what fits and say what you chose.';
    else {
      // Original labels, exactly as Claude wrote them (including any "(Recommended)").
      const labels = a.values.map((v) => q.options[oid[i]!.indexOf(v)]?.label ?? v);
      if (a.other) labels.push(a.other);
      value = labels.join(', ');
    }
    answers[q.question] = value;
    picks.push(`${q.header || q.question}: ${value}`);
  });

  const updatedInput: { questions: ClaudeQuestion[]; answers: Record<string, string>; response?: string } = {
    questions: input.questions,
    answers,
  };
  if (result.status === 'skipped') {
    updatedInput.response = opts.skipMessage ?? 'I’d rather not answer these. Use your best judgement, and tell me what you assumed.';
  } else if (result.delivery === 'composer' && result.message) {
    // `response` replaces the answer list, so picks made before replying travel inside it.
    updatedInput.response = picks.length ? `${result.message}\n\n(Picked so far: ${picks.join('; ')})` : result.message;
  }
  return { behavior: 'allow', updatedInput };
}
