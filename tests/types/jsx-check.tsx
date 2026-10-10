// Compile-only check of types/jsx.d.ts against real React 19 types (tsc -p tests/types).
import '@marigameo/agent-clarifier/jsx';
import type { ClarifyResult, Questionnaire } from '@marigameo/agent-clarifier';

declare const q: Questionnaire;

export const ok = (
  <agent-clarifier
    placement="dock"
    review="auto"
    questionnaire={q}
    onclarify:submit={(e: CustomEvent<ClarifyResult>) => e.detail.answers}
  />
);

// @ts-expect-error: placement only accepts 'replace' | 'dock'
export const bad = <agent-clarifier placement="sideways" />;
