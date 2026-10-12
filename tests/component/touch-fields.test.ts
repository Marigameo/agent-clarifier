import { afterEach, describe, expect, it } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';
import type { Questionnaire } from '../../src/index';
import { HOTEL, mount, row } from './helpers';

// Round 22 (process/22-size): below 16px, iOS zooms the whole page when a field is focused (round 11).
// The "Something else" field slipped to 14px in round 16: its `font: inherit` outranked the touch rule.

const NOTES: Questionnaire = { id: 'n', questions: [{ id: 'n', prompt: 'Anything else?', type: 'text' }] };
const touch = (enabled: boolean) => cdp().send('Emulation.setTouchEmulationEnabled', { enabled, maxTouchPoints: 1 });
const size = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
afterEach(() => touch(false));

describe('on a touch screen, no field is small enough to zoom the page', () => {
  it('the "Something else" field is at least 16px', async () => {
    await touch(true);
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    const m = mount(HOTEL);
    await userEvent.click(row(m, '__other'));
    expect(size(m.root.querySelector('.other-field textarea')!)).toBeGreaterThanOrEqual(16);
  });

  it('a text question’s field is at least 16px', async () => {
    await touch(true);
    const m = mount(NOTES);
    expect(size(m.root.querySelector('textarea')!)).toBeGreaterThanOrEqual(16);
  });

  it('with a mouse, the "Something else" field keeps the row’s 14px', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, '__other'));
    expect(size(m.root.querySelector('.other-field textarea')!)).toBe(14);
  });
});
