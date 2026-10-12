import { flushSync, mount, unmount, type Component } from 'svelte';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../../src/index';
import type { Questionnaire } from '../../../src/index';
import SvelteAttr from './SvelteAttr.svelte';
import SvelteOn from './SvelteOn.svelte';
import SvelteSpread from './SvelteSpread.svelte';

const Q: Questionnaire = { id: 's', questions: [{ id: 'a', prompt: 'Pick', type: 'single', options: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }] }] };

// Svelte 5 sets a prop as a property when the element has one (it's defined before mount). Event
// names with a colon are the open question: each way of writing the listener is tried (round 24).
describe('Svelte 5', () => {
  for (const [name, C] of [['on<event> attribute', SvelteAttr], ['legacy on: directive', SvelteOn], ['spread', SvelteSpread]] as const) {
    it(`questionnaire as a property; clarify:submit via the ${name}`, async () => {
      document.body.innerHTML = '<div id="app"></div>';
      const results: unknown[] = [];
      const app = mount(C as Component<{ q: unknown; onresult: (d: unknown) => void }>, {
        target: document.querySelector('#app')!,
        props: { q: Q, onresult: (d) => results.push(d) },
      });
      flushSync();
      const el = document.querySelector('agent-clarifier')!;
      expect(el.getAttribute('placement')).toBe('dock');
      expect(el.state).toBe('answering');
      await userEvent.click(el.shadowRoot!.querySelector<HTMLElement>('[data-opt="y"]')!);
      await expect.poll(() => el.state).toBe('answered');
      expect(results).toHaveLength(1);
      unmount(app);
    });
  }
});
