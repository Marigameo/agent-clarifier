import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { HOTEL, focused, mount, row } from './helpers';

// Round 20 (process/20-hover-sync): hover feedback is instant (Emil Kowalski, "7 practical animation
// tips" #6: hover seen tens of times a day shouldn't animate), and a row's arrow never shows without
// its partner: the fill under the mouse, or the ring for the keyboard.

const arrow = (m: ReturnType<typeof mount>, id: string) => getComputedStyle(row(m, id).querySelector('.trail')!).visibility === 'visible';
const filled = (m: ReturnType<typeof mount>, id: string) => getComputedStyle(row(m, id)).backgroundColor !== 'rgba(0, 0, 0, 0)';
const ringed = (m: ReturnType<typeof mount>, id: string) => getComputedStyle(row(m, id)).boxShadow !== 'none';

describe('hover and the arrow stay in sync', () => {
  it('hovering rows rapidly: fill and arrow switch together, in the same frame, with nothing animating', async () => {
    document.dispatchEvent(new PointerEvent('pointerdown')); // a mouse user
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    for (const id of ['covent', 'southbank', 'ken']) {
      await userEvent.hover(row(m, id));
      for (const other of ['covent', 'southbank', 'ken']) {
        const on = other === id;
        expect([filled(m, other), arrow(m, other)]).toEqual([on, on]);
        expect(row(m, other).getAnimations({ subtree: true })).toHaveLength(0);
      }
    }
  });

  it('with the mouse, the focused row shows no lone arrow (its ring is hidden, so is the arrow)', async () => {
    document.dispatchEvent(new PointerEvent('pointerdown'));
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.hover(row(m, 'covent'));
    expect([ringed(m, 'southbank'), arrow(m, 'southbank')]).toEqual([false, false]);
  });

  it('with the keyboard, the focused row keeps ring and arrow together', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.keyboard('{ArrowDown}');
    expect(focused(m)?.dataset.opt).toBe('ken');
    expect([ringed(m, 'ken'), arrow(m, 'ken')]).toEqual([true, true]);
  });
});

// Round 21 add-on: the number key was 2% away from the hover fill, so it vanished into a hovered row.
// It now takes a step toward ink with the fill, and its number turns ink. Selected keys keep the accent.
describe('the key answers the hover with its row', () => {
  const key = (m: ReturnType<typeof mount>, id: string) => getComputedStyle(row(m, id).querySelector('.key')!);

  it('a hovered row darkens its key and inks its number; the others stay at rest', async () => {
    document.dispatchEvent(new PointerEvent('pointerdown'));
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    const rest = key(m, 'covent').backgroundColor;
    await userEvent.hover(row(m, 'covent'));
    expect(key(m, 'covent').backgroundColor).not.toBe(rest);
    expect(key(m, 'covent').color).toBe(getComputedStyle(row(m, 'covent')).color);
    expect(key(m, 'ken').backgroundColor).toBe(rest);
    expect(row(m, 'covent').getAnimations({ subtree: true })).toHaveLength(0);
  });

  it('the "Something else" key answers too', async () => {
    document.dispatchEvent(new PointerEvent('pointerdown'));
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    const rest = key(m, 'covent').backgroundColor;
    await userEvent.hover(row(m, '__other'));
    expect(key(m, '__other').backgroundColor).not.toBe(rest);
  });
});
