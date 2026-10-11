import { describe, expect, it } from 'vitest';
import type { Questionnaire } from '../../src/index';
import { mount } from './helpers';

// Round 18 (process/18-sticky-header): the stuck header kept its top padding.
const NINE: Questionnaire = {
  id: 'nine',
  source: 'Data migration assistant',
  questions: [{ id: 'q', prompt: 'Which cuisine?', type: 'single', options: 'Italian Japanese Indian Mexican Thai French Lebanese Greek Korean'.split(' ').map((l) => ({ id: l.toLowerCase(), label: l })) }],
};
const gap = (m: ReturnType<typeof mount>) =>
  m.root.querySelector('.source')!.getBoundingClientRect().top - m.root.querySelector('.card')!.getBoundingClientRect().top;

describe('the sticky header', () => {
  it('keeps its top padding once stuck: "Asked by" never touches the card edge', async () => {
    const m = mount(NINE, { style: '--clarify-max-height: 420px' });
    const scroll = m.root.querySelector<HTMLElement>('.scroll')!;
    await expect.poll(() => scroll.scrollHeight > scroll.clientHeight).toBe(true);
    expect(m.root.querySelector('.card')!.hasAttribute('data-tall')).toBe(false); // it sticks
    const rest = gap(m);
    scroll.scrollTop = 200;
    await new Promise((r) => requestAnimationFrame(r));
    expect(scroll.scrollTop).toBeGreaterThan(0);
    expect(gap(m)).toBe(rest);
    expect(rest).toBeGreaterThan(10);
  });
});
