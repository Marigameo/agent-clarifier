// Public entry. Importing it defines <agent-clarifier> (once, and only in a browser).
import { AgentClarifier } from './element.js';
import type { ClarifyResult, Status } from './model/types.js';

export { AgentClarifier };
export { ask, type AskOptions } from './ask.js';
export const VERSION = '0.2.1';

if (typeof customElements !== 'undefined' && !customElements.get('agent-clarifier')) {
  customElements.define('agent-clarifier', AgentClarifier);
}

declare global {
  interface HTMLElementTagNameMap {
    'agent-clarifier': AgentClarifier;
  }
  // Typed events: el.addEventListener('clarify:submit', (e) => e.detail.answers) just works.
  interface HTMLElementEventMap {
    'clarify:submit': CustomEvent<ClarifyResult>;
    'clarify:revise': CustomEvent<ClarifyResult>;
    'clarify:skip': CustomEvent<ClarifyResult>;
    'clarify:reply': CustomEvent<ClarifyResult>;
    'clarify:expire': CustomEvent<ClarifyResult>;
    'clarify:change': CustomEvent<{ answers: ClarifyResult['answers'] }>;
    'clarify:compose': CustomEvent<{ text: string; questionId: string; optionId: string }>;
    'clarify:dismiss': CustomEvent<{ resumeTo: Status | null }>;
    'clarify:reopen': CustomEvent<null>;
    'clarify:error': CustomEvent<{ reason: 'empty' }>;
  }
}

export type {
  Questionnaire,
  Question,
  Option,
  Flow,
  QuestionType,
  ReviewMode,
  ClarifyResult,
  ResultStatus,
  Answer,
  AnswerStatus,
  Status,
} from './model/types.js';
export type { Label, LabelKey, Labels, PluralForms } from './labels.js';
