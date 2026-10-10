import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { ClarifyResult } from '../../src/index';
import { HOTEL, button, focused, live, mount, onStep, row } from './helpers';

const ALL = { ...HOTEL, flow: 'all' as const, title: 'A few quick questions' };

describe('all at once', () => {
  it('keyboard only: Tab between groups, arrows within, Space picks, then send', async () => {
    const m = mount(ALL);
    // Focus starts on the first group's tabbable chip (the recommended one).
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.keyboard('{ArrowLeft} ');
    expect(row(m, 'covent').getAttribute('aria-checked')).toBe('true');

    await userEvent.tab(); // → Budget group
    expect(focused(m)?.closest('[data-q]')?.getAttribute('data-q')).toBe('budget');
    await userEvent.keyboard('{End} '); // Decide for me
    expect(row(m, '__delegate').getAttribute('aria-checked')).toBe('true');

    await userEvent.tab(); // → Priorities group
    await userEvent.keyboard(' {ArrowRight} ');
    expect(m.el.snapshot.drafts.extras!.values).toEqual(['walk', 'quiet']);

    await userEvent.tab(); // → the text field
    expect(focused(m)?.tagName).toBe('TEXTAREA');
    await userEvent.keyboard('Late check-in');

    await userEvent.tab(); // → Skip all
    await userEvent.tab(); // → Send
    expect(focused(m)?.dataset.act).toBe('send');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => m.el.state).toBe('answered');
    const result = m.events.find((e) => e.name === 'submit')!.detail as ClarifyResult;
    expect(result.answers).toMatchObject({
      area: { values: ['covent'] },
      budget: { status: 'delegated' },
      extras: { values: ['walk', 'quiet'] },
      notes: { labels: ['Late check-in'] },
    });
  });

  it('errors show only after a send attempt', async () => {
    const q = { ...ALL, questions: ALL.questions.map((x) => (x.id === 'notes' ? { ...x, required: true } : x)) };
    const m = mount(q);
    await userEvent.click(row(m, 'covent'));
    expect(m.root.querySelector('.q.invalid')).toBeNull();
    await userEvent.click(button(m, 'send'));
    expect(m.el.state).toBe('answering');
    expect(m.root.querySelector('.q.invalid')?.getAttribute('data-q')).toBe('notes');
    // Skip all isn't offered when a question is required.
    expect(button(m, 'skip-all')).toBeNull();
  });

  it('mouse only: chips, "Something else" field, Skip all', async () => {
    const m = mount(ALL);
    await userEvent.click(row(m, '__other'));
    await expect.poll(() => focused(m)?.tagName).toBe('INPUT');
    await userEvent.keyboard('Zone 2');
    expect(m.el.snapshot.drafts.area).toMatchObject({ other: 'Zone 2', otherActive: true });
    await userEvent.click(button(m, 'skip-all'));
    await expect.poll(() => m.events.some((e) => e.name === 'skip')).toBe(true);
  });
});

describe('placements and the composer', () => {
  it('replace hides the composer even when the app styles it display:flex, and restores it exactly', async () => {
    const m = mount(HOTEL);
    expect(getComputedStyle(m.form).display).toBe('none');
    expect(m.form.hidden).toBe(true);
    m.el.minimise();
    expect(getComputedStyle(m.form).display).toBe('flex');
    expect(m.form.hidden).toBe(false);
    // The app's own inline value comes back (the browser may respell the attribute text).
    expect(m.form.style.getPropertyValue('display')).toBe('flex');
    expect(m.form.style.getPropertyPriority('display')).toBe('');
  });

  it('a message sent while minimised is the answer, not a normal send', async () => {
    const m = mount(HOTEL);
    let appSent = false;
    m.form.addEventListener('submit', () => (appSent = true));
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget per night?');
    await userEvent.keyboard('{Escape}');
    await userEvent.keyboard('Somewhere quiet');
    m.form.requestSubmit();
    expect(appSent).toBe(false);
    expect(m.box.value).toBe('');
    const reply = m.events.find((e) => e.name === 'reply')!.detail as ClarifyResult;
    expect(reply).toMatchObject({ delivery: 'composer', message: 'Somewhere quiet' });
    expect(reply.answers.area!.values).toEqual(['covent']);
    expect(m.box.placeholder).toBe('Message…'); // the app's placeholder is back
  });

  it('dock keeps the composer, does not steal focus, and sending answers', async () => {
    const before = document.createElement('button');
    const m = mount(HOTEL, { placement: 'dock' });
    document.body.prepend(before);
    before.focus();
    m.el.reset();
    m.el.open(HOTEL);
    expect(document.activeElement).toBe(before);
    expect(getComputedStyle(m.form).display).toBe('flex');
    expect(m.form.hasAttribute('data-clarifier-docked')).toBe(true);
    expect(m.box.placeholder).toBe('Or reply in your own words…');
    m.box.value = 'Just pick for me';
    m.form.requestSubmit();
    expect(m.el.state).toBe('answered');
    expect(m.form.hasAttribute('data-clarifier-docked')).toBe(false);
  });

  it('when the card is done, ordinary messages pass through to the app', async () => {
    const m = mount(HOTEL);
    m.el.expire();
    let appSent = false;
    m.form.addEventListener('submit', () => (appSent = true));
    m.box.value = 'Thanks!';
    m.form.requestSubmit();
    expect(appSent).toBe(true);
  });

  it('a compose option starts a sentence in front of what was typed, and reopen takes it back if untouched', async () => {
    const m = mount({
      id: 'c',
      questions: [{ id: 'a', prompt: 'Access needs?', type: 'single', other: false, options: [{ id: 'none', label: 'None' }, { id: 'x', label: 'I’ll explain', compose: 'For accessibility, I need ' }] }],
    });
    m.box.value = 'Also ';
    await userEvent.click(row(m, 'x'));
    expect(m.el.state).toBe('minimised');
    expect(m.box.value).toBe('For accessibility, I need Also ');
    expect(document.activeElement).toBe(m.box);
    expect(m.box.selectionStart).toBe('For accessibility, I need '.length);
    m.el.reopen();
    expect(m.box.value).toBe('Also ');
  });

  it('announces minimising and moves focus back into the card on reopen', async () => {
    const m = mount(HOTEL);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    m.el.minimise();
    await expect.poll(() => live(m)).toContain('Questions minimised');
    await userEvent.click(m.root.querySelector<HTMLElement>('[data-act="reopen"]')!);
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
  });
});
