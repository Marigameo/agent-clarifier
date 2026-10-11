import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { HOTEL, button, focused, mount, onStep, row, title } from './helpers';

// Round 21 (process/21-footer-nav): Back lives in the footer (the edge that stays put on a
// bottom-anchored card), dimmed on step 1; the dashes say each step's status and are easy to hit.

const back = (m: ReturnType<typeof mount>) => m.root.querySelector<HTMLButtonElement>('[data-act="back"]')!;
const titleLeft = (m: ReturnType<typeof mount>) => Math.round(m.root.querySelector('.title')!.getBoundingClientRect().left);
const dots = (m: ReturnType<typeof mount>) => [...m.root.querySelectorAll<HTMLElement>('.dots .dot')].map((d) => d.classList.contains('now') ? 'now' : d.classList.contains('done') ? 'done' : d.classList.contains('skip') ? 'skip' : '-');

describe('Back in the footer', () => {
  it('sits in the footer, outside the toast slot; the title keeps one edge on every step', async () => {
    const m = mount(HOTEL);
    expect(back(m).closest('.foot')).not.toBeNull();
    expect(back(m).closest('.foot-l')).toBeNull();
    expect(m.root.querySelector('.head [data-act="back"]')).toBeNull();
    const edge = titleLeft(m);
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget per night?');
    await expect.poll(() => titleLeft(m)).toBe(edge); // after the 12px slide settles
  });

  it('on step 1 it is shown dimmed (still focusable) and does nothing', async () => {
    const m = mount(HOTEL);
    expect(back(m).hidden).toBe(false);
    expect(back(m).disabled).toBe(false);
    expect(back(m).getAttribute('aria-disabled')).toBe('true');
    back(m).click(); // a direct click: the test runner itself won't click an aria-disabled control
    expect(title(m)).toBe('Which area?');
  });

  it('stays visible while a toast is showing', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.click(button(m, 'skip'));
    await onStep(m, 'Budget per night?');
    expect(m.root.querySelector('.toast')).not.toBeNull();
    expect(back(m).getBoundingClientRect().width).toBeGreaterThan(0);
  });

  it('pressed from the keyboard, focus stays on Back: repeated Enter keeps going back, never picks', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget per night?');
    await userEvent.click(row(m, 'mid'));
    await onStep(m, 'What matters most?');
    back(m).focus();
    await userEvent.keyboard('{Enter}');
    await onStep(m, 'Budget per night?');
    await expect.poll(() => focused(m)?.dataset.act).toBe('back');
    await userEvent.keyboard('{Enter}');
    await onStep(m, 'Which area?');
    await expect.poll(() => focused(m)?.dataset.act).toBe('back');
    await userEvent.keyboard('{Enter}'); // dimmed on step 1: nothing happens, nothing is picked
    expect(title(m)).toBe('Which area?');
    expect(m.el.snapshot.drafts.area).toMatchObject({ values: ['covent'] });
  });

  it('at 320px, when the buttons wrap, Back and the dashes stay together', async () => {
    const m = mount(HOTEL, { style: 'inline-size: 320px' });
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget per night?');
    await userEvent.click(row(m, 'mid'));
    await onStep(m, 'What matters most?');
    const gap = m.root.querySelector('.dots')!.getBoundingClientRect().left - back(m).getBoundingClientRect().right;
    expect(gap).toBeLessThan(16);
  });

  it('the ← key still lands on the options', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget per night?');
    await userEvent.keyboard('{ArrowLeft}');
    await onStep(m, 'Which area?');
    await expect.poll(() => focused(m)?.dataset.opt).toBeTruthy();
  });
});

describe('the progress dashes', () => {
  it('show status, not position: current, answered, skipped, not reached', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.click(button(m, 'skip'));
    await onStep(m, 'Budget per night?');
    await userEvent.click(row(m, 'mid'));
    await onStep(m, 'What matters most?');
    expect(dots(m)).toEqual(['skip', 'done', 'now', '-']);
    await userEvent.click(m.root.querySelector<HTMLElement>('.dots button')!); // jump to step 1
    await onStep(m, 'Which area?');
    expect(dots(m)).toEqual(['now', 'done', '-', '-']); // step 2 stays "answered" after going back
  });

  it('a clickable dash has a 24×24 target, 24px from its neighbour, and answers the pointer', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget per night?');
    await userEvent.click(row(m, 'mid'));
    await onStep(m, 'What matters most?');
    const [a, b] = [...m.root.querySelectorAll<HTMLElement>('.dots .dot')];
    const s = getComputedStyle(a!, '::after');
    const r = a!.getBoundingClientRect();
    expect([r.width - parseFloat(s.left) - parseFloat(s.right), r.height - parseFloat(s.top) - parseFloat(s.bottom)]).toEqual([24, 24]);
    expect(b!.getBoundingClientRect().left - r.left).toBe(24);
    await userEvent.hover(a!);
    expect(getComputedStyle(a!).transform).toBe('matrix(1, 0, 0, 1.5, 0, 0)');
  });
});
