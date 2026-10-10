// Public entry. Importing it defines <agent-clarifier> (once, and only in a browser).
import { AgentClarifier } from './element';

export { AgentClarifier };
export const VERSION = '0.0.0';

if (typeof customElements !== 'undefined' && !customElements.get('agent-clarifier')) {
  customElements.define('agent-clarifier', AgentClarifier);
}

declare global {
  interface HTMLElementTagNameMap {
    'agent-clarifier': AgentClarifier;
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
} from './model/types';
export type { Label, LabelKey, Labels, PluralForms } from './labels';
