import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { ClarifyResult } from '../../src/index';
import { HOTEL, button, focused, live, mount, onStep, plain, row, title } from './helpers';

describe('sequential · keyboard only', () => {
  it('answers every input type and sends, without touching the mouse', async () => {
    const m = mount(HOTEL);

    // Opening (replace) puts focus on the recommended option and announces the question.
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await expect.poll(() => live(m)).toBe('Question 1 of 4: Which area?');

    // 1–9 pick; a single pick confirms briefly, then moves on.
    await userEvent.keyboard('3');
    await onStep(m, 'Budget per night?');
    await expect.poll(() => live(m)).toContain('Question 2 of 4');

    // End reaches "Decide for me"; Enter picks it and moves on (it's a complete answer).
    await expect.poll(() => focused(m)?.dataset.opt).toBe('low');
    await userEvent.keyboard('{End}');
    expect(focused(m)?.dataset.opt).toBe('__delegate');
    await userEvent.keyboard('{Enter}');
    await onStep(m, 'What matters most?');

    // Multi: numbers toggle, a third pick is blocked at max 2, Enter continues.
    await userEvent.keyboard('12');
    await userEvent.keyboard('3');
    await expect.poll(() => live(m)).toBe('Up to 2 picks. Unpick one first.');
    expect(row(m, 'gym').getAttribute('aria-checked')).toBe('false');
    await userEvent.keyboard('{Enter}');
    await onStep(m, 'Anything else?');

    // Text: focus is in the field; Shift+Enter is a new line, Enter continues.
    await expect.poll(() => focused(m)?.tagName).toBe('TEXTAREA');
    await userEvent.keyboard('Quiet room{Shift>}{Enter}{/Shift}high floor');
    await userEvent.keyboard('{Enter}');
    await onStep(m, 'Check your answers');
    await expect.poll(() => live(m)).toBe('Review your answers.');

    // Review: focus is on Send; ← goes back a step, Enter returns to review via Continue.
    await expect.poll(() => focused(m)?.dataset.act).toBe('send');
    await userEvent.keyboard('{ArrowLeft}');
    await onStep(m, 'Anything else?');
    await expect.poll(() => focused(m)?.tagName).toBe('TEXTAREA');
    await userEvent.keyboard('{Enter}');
    await onStep(m, 'Check your answers');
    await expect.poll(() => focused(m)?.dataset.act).toBe('send');
    await userEvent.keyboard('{Enter}');

    await expect.poll(() => m.events.find((e) => e.name === 'submit')).toBeTruthy();
    const result = m.events.find((e) => e.name === 'submit')!.detail as ClarifyResult;
    expect(result.answers).toMatchObject({
      area: { status: 'answered', values: ['ken'] },
      budget: { status: 'delegated' },
      extras: { status: 'answered', values: ['walk', 'quiet'] },
      notes: { status: 'answered', labels: ['Quiet room\nhigh floor'] },
    });
    await expect.poll(() => live(m)).toBe('Answers sent.');
  });

  it('arrows move focus within the options and only one option is in the Tab order', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.keyboard('{ArrowDown}');
    expect(focused(m)?.dataset.opt).toBe('ken');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(focused(m)?.dataset.opt).toBe('covent'); // past "Something else", wrapping to the top
    const tabbable = m.root.querySelectorAll('.list [tabindex="0"]');
    expect(tabbable).toHaveLength(1);
    expect((tabbable[0] as HTMLElement).dataset.opt).toBe('covent');
  });

  it('⌘Z / Ctrl+Z undoes a skip; Esc minimises and gives the composer focus', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    button(m, 'skip').focus();
    await userEvent.keyboard('{Enter}');
    await onStep(m, 'Budget per night?');
    await expect.poll(() => live(m)).toContain('Skipped Area. Undo available.');
    await userEvent.keyboard('{Control>}z{/Control}');
    await onStep(m, 'Which area?');

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => m.el.state).toBe('minimised');
    expect(document.activeElement).toBe(m.box);
    expect(m.box.placeholder).toBe('Or reply in your own words…');
  });

  it('"Something else": typing number keys types numbers; Esc leaves the field with the text kept', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.keyboard('{End}{Enter}');
    await expect.poll(() => focused(m)?.tagName).toBe('INPUT');
    await userEvent.keyboard('Zone 2');
    expect(m.el.snapshot.drafts.area).toMatchObject({ other: 'Zone 2', otherActive: true, values: [] });
    await userEvent.keyboard('{Escape}');
    expect(focused(m)?.dataset.opt).toBe('__other');
    expect(m.el.state).toBe('answering');
    expect(m.el.snapshot.drafts.area!.other).toBe('Zone 2');
  });

  it('keys pressed while an IME is composing (Japanese, Chinese…) are ignored', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    focused(m)!.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true, composed: true, isComposing: true }));
    await new Promise((r) => setTimeout(r, 200));
    expect(m.el.snapshot.drafts.area!.values).toEqual([]);
    expect(title(m)).toBe('Which area?');
  });

  it('in right-to-left pages, → goes back', async () => {
    const m = mount(HOTEL);
    document.querySelector('#page')!.setAttribute('dir', 'rtl');
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.keyboard('1');
    await onStep(m, 'Budget per night?');
    await userEvent.keyboard('{ArrowRight}');
    await onStep(m, 'Which area?');
  });
});

describe('sequential · mouse only', () => {
  it('answers and sends with clicks', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget per night?');
    await userEvent.click(row(m, 'mid'));
    await onStep(m, 'What matters most?');
    await userEvent.click(row(m, 'gym'));
    await userEvent.click(button(m, 'next'));
    await onStep(m, 'Anything else?');
    await userEvent.click(button(m, 'skip'));
    await onStep(m, 'Check your answers');
    await userEvent.click(button(m, 'send'));
    await expect.poll(() => m.el.state).toBe('answered');
    const result = m.events.find((e) => e.name === 'submit')!.detail as ClarifyResult;
    expect(result.answers.notes!.status).toBe('skipped');
    expect(result.answers.extras!.labels).toEqual(['Gym']);
  });

  it('settled steps in the progress dashes are buttons that jump back', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget per night?');
    await userEvent.click(row(m, 'mid'));
    await onStep(m, 'What matters most?');
    const dots = m.root.querySelectorAll('.dots button');
    expect(dots).toHaveLength(2); // the two answered steps; the current and later ones aren't buttons
    expect(plain(dots[0]!.getAttribute('aria-label'))).toBe('Go to question 1: Area');
    await userEvent.click(dots[0] as HTMLElement);
    await onStep(m, 'Which area?');
  });

  it('a step change animates the height and slides the new question in', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget per night?');
    const card = m.root.querySelector<HTMLElement>('.card')!;
    const running = [...card.getAnimations(), ...card.querySelector<HTMLElement>('.scroll')!.getAnimations()];
    expect(running).toHaveLength(2);
  });

  it('Back returns with the earlier pick still selected', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget per night?');
    await userEvent.click(button(m, 'back'));
    await onStep(m, 'Which area?');
    expect(row(m, 'covent').getAttribute('aria-checked')).toBe('true');
    expect(title(m)).toBe('Which area?');
  });
});
