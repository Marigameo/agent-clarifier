import { expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createApp, h } from 'vue';
import '../../../src/index';
import type { ClarifyResult, Questionnaire } from '../../../src/index';

const Q: Questionnaire = { id: 'v', questions: [{ id: 'a', prompt: 'Pick', type: 'single', options: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }] }] };

// Vue 3 binds a prop as a property when the element has it (the element is defined before mount),
// and onClarify:submit listens for "clarify:submit".
it('Vue 3: questionnaire as a property, onClarify:submit as a listener', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const results: ClarifyResult[] = [];
  const app = createApp({
    render: () => h('agent-clarifier', { placement: 'dock', questionnaire: Q, 'onClarify:submit': (e: CustomEvent<ClarifyResult>) => results.push(e.detail) }),
  });
  app.config.compilerOptions.isCustomElement = (tag) => tag === 'agent-clarifier';
  app.mount('#app');
  const el = document.querySelector('agent-clarifier')!;
  expect(el.state).toBe('answering');
  await userEvent.click(el.shadowRoot!.querySelector<HTMLElement>('[data-opt="x"]')!);
  await expect.poll(() => results.length).toBe(1);
  expect(results[0]!.answers.a!.values).toEqual(['x']);
  app.unmount();
});
