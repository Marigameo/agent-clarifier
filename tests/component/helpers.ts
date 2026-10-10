import { expect } from 'vitest';
import '../../src/index';
import type { AgentClarifier, Questionnaire } from '../../src/index';

export const HOTEL: Questionnaire = {
  id: 'hotel',
  questions: [
    {
      id: 'area', label: 'Area', prompt: 'Which area?', type: 'single',
      options: [{ id: 'covent', label: 'Covent Garden' }, { id: 'southbank', label: 'South Bank', recommended: true }, { id: 'ken', label: 'Kensington' }],
    },
    {
      id: 'budget', label: 'Budget', prompt: 'Budget per night?', type: 'single', delegate: true,
      options: [{ id: 'low', label: '$250–400' }, { id: 'mid', label: '$400–600' }, { id: 'high', label: '$600+' }],
    },
    {
      id: 'extras', label: 'Priorities', prompt: 'What matters most?', type: 'multi', max: 2,
      options: [{ id: 'walk', label: 'Walkable' }, { id: 'quiet', label: 'Quiet' }, { id: 'gym', label: 'Gym' }],
    },
    { id: 'notes', label: 'Notes', prompt: 'Anything else?', type: 'text' },
  ],
};

export interface Mounted {
  el: AgentClarifier;
  root: ShadowRoot;
  form: HTMLFormElement;
  box: HTMLTextAreaElement;
  events: { name: string; detail: unknown }[];
}

/** A tiny chat page: the element, then a composer form, like an app would have. */
export function mount(q: Questionnaire, attrs: Record<string, string> = {}): Mounted {
  document.body.replaceChildren();
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div id="page"><agent-clarifier composer="#box"></agent-clarifier>
     <form id="form" style="display:flex"><textarea id="box" placeholder="Message…"></textarea><button>Send</button></form></div>`,
  );
  const el = document.querySelector('agent-clarifier')!;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  const events: Mounted['events'] = [];
  for (const name of ['change', 'submit', 'revise', 'skip', 'reply', 'compose', 'dismiss', 'reopen', 'expire', 'error']) {
    el.addEventListener(`clarify:${name}`, (e) => events.push({ name, detail: (e as CustomEvent).detail }));
  }
  const form = document.querySelector<HTMLFormElement>('#form')!;
  form.addEventListener('submit', (e) => e.preventDefault()); // the app's own send
  el.open(q);
  return { el, root: el.shadowRoot!, form, box: document.querySelector<HTMLTextAreaElement>('#box')!, events };
}

export const title = (m: Mounted) => m.root.querySelector('.title')?.textContent ?? '';
export const focused = (m: Mounted) => m.root.activeElement as HTMLElement | null;
export const live = (m: Mounted) => m.root.querySelector('.live')?.textContent ?? '';
export const row = (m: Mounted, id: string) => m.root.querySelector<HTMLElement>(`[data-opt="${id}"]`)!;
export const button = (m: Mounted, act: string) => m.root.querySelector<HTMLButtonElement>(`[data-act="${act}"]:not([hidden])`)!;

/** Wait until the card shows this question (auto-advance waits 120ms). */
export async function onStep(m: Mounted, prompt: string): Promise<void> {
  await expect.poll(() => title(m)).toContain(prompt);
}
