import { createElement, useState } from 'react';
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

// Round 23: the card writes to the composer (clearing it after a reply) without going through
// React's value tracker, so a controlled textarea's state follows and the text never comes back.
it('React 19: a controlled composer is cleared for real after a reply', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  let state = '';
  let bump!: () => void;
  function App() {
    const [v, setV] = useState('');
    const [, setN] = useState(0);
    state = v;
    bump = () => setN((n) => n + 1);
    return createElement(
      'div',
      null,
      createElement('agent-clarifier', { placement: 'dock', composer: '#box', questionnaire: Q }),
      createElement(
        'form',
        { onSubmit: (e: Event) => e.preventDefault() },
        createElement('textarea', { id: 'box', value: v, onChange: (e: { target: HTMLTextAreaElement }) => setV(e.target.value) }),
        createElement('button', null, 'Send'),
      ),
    );
  }
  const root = createRoot(document.querySelector('#app')!);
  flushSync(() => root.render(createElement(App)));
  const box = document.querySelector<HTMLTextAreaElement>('#box')!;
  await userEvent.fill(box, 'hello there');
  expect(state).toBe('hello there');
  await userEvent.click(document.querySelector('button')!);
  expect(document.querySelector('agent-clarifier')!.state).toBe('answered');
  await expect.poll(() => state).toBe('');
  flushSync(bump);
  expect(box.value).toBe('');
  root.unmount();
});
