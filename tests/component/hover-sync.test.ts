import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { HOTEL, button, focused, mount, onStep, row } from './helpers';

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

// Round 21 add-on 2: the pencil and Decide-for-me keys stayed a grey key on a picked row (a lighter square
// on the fill, the icon grey while the label turned ink). Ink on the fill was tried next and was too quiet,
// so picked, they're filled like every other picked key. A pressed Decide for me also keeps it on hover.
describe('picked, the plain keys are filled like every picked key', () => {
  const bg = (el: Element) => getComputedStyle(el).backgroundColor;
  const matches = (r: HTMLElement) => {
    const key = getComputedStyle(r.querySelector('.key')!);
    // The reference: what the theme's accent fill and its text resolve to.
    const ref = r.ownerDocument.createElement('span');
    ref.style.cssText = 'background: var(--_accent); color: var(--_accent-fg)';
    r.after(ref);
    expect([key.backgroundColor, key.color]).toEqual([bg(ref), getComputedStyle(ref).color]);
    expect(key.backgroundColor).not.toBe(bg(r));
    ref.remove();
  };

  it('"Something else": the pencil key is filled once picked, and stays so while typing', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.click(row(m, '__other'));
    expect(row(m, '__other').getAttribute('aria-checked')).toBe('true');
    matches(row(m, '__other'));
    await userEvent.keyboard('Near Kings Cross'); // still the same while typing
    matches(row(m, '__other'));
  });

  it('Decide for me: the key is filled once picked (seen again after Back)', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.keyboard(' ');
    await onStep(m, 'Budget');
    await userEvent.click(row(m, '__delegate'));
    await onStep(m, 'What matters');
    await userEvent.click(button(m, 'back'));
    await onStep(m, 'Budget');
    expect(row(m, '__delegate').getAttribute('aria-checked')).toBe('true');
    matches(row(m, '__delegate'));
  });

  it('a pressed Decide for me (text question) keeps its picked fill and filled key under the mouse', async () => {
    document.dispatchEvent(new PointerEvent('pointerdown'));
    const m = mount({ id: 't', questions: [{ id: 'n', prompt: 'Anything else?', type: 'text', delegate: true }, { id: 'm', prompt: 'And?', type: 'text' }] });
    await onStep(m, 'Anything else');
    await userEvent.click(row(m, '__delegate'));
    await onStep(m, 'And?');
    await userEvent.click(button(m, 'back'));
    await onStep(m, 'Anything else');
    const r = row(m, '__delegate');
    expect(r.getAttribute('aria-pressed')).toBe('true');
    const picked = bg(r);
    await userEvent.hover(r);
    expect(bg(r)).toBe(picked);
    matches(r);
  });
});
