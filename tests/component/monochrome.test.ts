import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { Questionnaire } from '../../src/index';
import { HOTEL, focused, mount, row } from './helpers';

// Round 28 (process/28-monochrome): one colour on the card. A pick is ink like the primary button,
// keyboard focus is grey so a focused row never reads as picked, and an app's accent still
// recolours both.

const MULTI: Questionnaire = {
  id: 'multi',
  questions: [{ id: 'm', prompt: 'Which cuisines?', type: 'multi', options: [{ id: 'it', label: 'Italian' }, { id: 'jp', label: 'Japanese' }] }],
};
const GREY = 'rgb(118, 118, 118)'; // #767676
const css = (el: Element, prop: string) => getComputedStyle(el).getPropertyValue(prop);
const key = (m: ReturnType<typeof mount>, id: string) => row(m, id).querySelector('.key')!;
const primary = (m: ReturnType<typeof mount>) => m.root.querySelector('.btn.primary:not([hidden])')!;

describe('the card has one colour', () => {
  it('a tick is filled with the same ink as the primary button', async () => {
    const m = mount(MULTI);
    await userEvent.click(row(m, 'it'));
    expect(css(key(m, 'it'), 'background-color')).toBe(css(primary(m), 'background-color'));
  });

  it('keyboard focus is a grey ring, not the colour of a pick', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.keyboard('{ArrowDown}');
    expect(css(row(m, 'ken'), 'box-shadow')).toContain(GREY);
  });

  it('an app’s accent still recolours the picks and the ring', async () => {
    document.documentElement.style.setProperty('--clarify-accent', 'rgb(11, 122, 95)');
    try {
      const m = mount(MULTI);
      await userEvent.click(row(m, 'it'));
      expect(css(key(m, 'it'), 'background-color')).toBe('rgb(11, 122, 95)');
      await userEvent.keyboard('{ArrowDown}');
      expect(css(row(m, 'jp'), 'box-shadow')).toContain('rgb(11, 122, 95)');
    } finally {
      document.documentElement.style.removeProperty('--clarify-accent');
    }
  });
});
