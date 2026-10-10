import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../../src/index';
import type { ClarifyResult, Questionnaire } from '../../../src/index';

const Q: Questionnaire = { id: 'r', questions: [{ id: 'a', prompt: 'Pick', type: 'single', options: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }] }] };

// React 19 sets objects as properties on custom elements and attaches on<event> props as listeners.
it('React 19: questionnaire as a property, onclarify:submit as a listener', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const results: ClarifyResult[] = [];
  const root = createRoot(document.querySelector('#app')!);
  flushSync(() =>
    root.render(
      createElement('agent-clarifier', {
        placement: 'dock',
        questionnaire: Q,
        'onclarify:submit': (e: CustomEvent<ClarifyResult>) => results.push(e.detail),
      }),
    ),
  );
  const el = document.querySelector('agent-clarifier')!;
  expect(el.getAttribute('placement')).toBe('dock');
  expect(el.state).toBe('answering');
  await userEvent.click(el.shadowRoot!.querySelector<HTMLElement>('[data-opt="y"]')!);
  await expect.poll(() => results.length).toBe(1);
  expect(results[0]!.answers.a!.values).toEqual(['y']);
  root.unmount();
});
