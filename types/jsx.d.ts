// Opt-in typings for JSX (React 19, Preact): `import '@marigameo/agent-clarifier/jsx'` once.
// Kept out of the main entry so the package never depends on React's types.
import type { AgentClarifier, ClarifyResult, Labels, Questionnaire, ReviewMode, Flow } from '@marigameo/agent-clarifier';

type Handler<T> = (event: CustomEvent<T>) => void;

export interface AgentClarifierProps {
  placement?: 'replace' | 'dock';
  flow?: Flow;
  density?: 'comfortable' | 'compact';
  review?: ReviewMode;
  'undo-window'?: number | string;
  theme?: 'auto' | 'light' | 'dark';
  disabled?: boolean;
  /** CSS selector of the app's message box. */
  composer?: string;
  'composer-container'?: string;
  /** React 19 sets objects as properties on custom elements. */
  questionnaire?: Questionnaire;
  labels?: Partial<Labels>;
  id?: string;
  class?: string;
  className?: string;
  style?: unknown;
  ref?: unknown;
  // React 19 attaches `on<event>` props on custom elements as listeners for that exact event name.
  'onclarify:submit'?: Handler<ClarifyResult>;
  'onclarify:revise'?: Handler<ClarifyResult>;
  'onclarify:skip'?: Handler<ClarifyResult>;
  'onclarify:reply'?: Handler<ClarifyResult>;
  'onclarify:expire'?: Handler<ClarifyResult>;
  'onclarify:change'?: Handler<{ answers: ClarifyResult['answers'] }>;
  'onclarify:compose'?: Handler<{ text: string; questionId: string; optionId: string }>;
  'onclarify:dismiss'?: Handler<{ resumeTo: string | null }>;
  'onclarify:reopen'?: Handler<null>;
  'onclarify:error'?: Handler<{ reason: 'empty' }>;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'agent-clarifier': AgentClarifierProps;
    }
  }
}

export type { AgentClarifier };
