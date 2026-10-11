import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { Questionnaire } from '../../src/index';
import { HOTEL, button, focused, mount, onStep, plain, row, title } from './helpers';

// Round 11: the better-interface audit (process/11-interface-audit). One test per fix, named after
// the user-visible failure it prevents.

const MULTI9: Questionnaire = {
  id: 'nine',
  questions: [{ id: 'm', label: 'Cuisine', prompt: 'Which cuisines?', type: 'multi', min: 2, other: true, options: 'Italian Japanese Indian Mexican Thai French Lebanese Greek Korean'.split(' ').map((l) => ({ id: l.toLowerCase(), label: l })) }],
};

const ONE: Questionnaire = {
  id: 'one',
  questions: [{ id: 'yes', label: 'Flights', prompt: 'Include flights?', type: 'single', options: [{ id: 'y', label: 'Yes' }, { id: 'n', label: 'No' }] }],
};

describe('focus never hides or gets lost', () => {
  it('arrow keys never land on a row hidden under the sticky header (#2)', async () => {
    const m = mount(MULTI9, { style: '--clarify-max-height: 320px' });
    await expect.poll(() => focused(m)?.dataset.opt).toBe('italian');
    await userEvent.keyboard('{End}');
    for (let i = 0; i < 9; i++) {
      await userEvent.keyboard('{ArrowUp}');
      const header = m.root.querySelector('.top')!.getBoundingClientRect();
      const r = focused(m)!.getBoundingClientRect();
      expect(r.top).toBeGreaterThanOrEqual(header.bottom - 1);
    }
  });

  it('pressing Send by keyboard keeps focus on it, so Try again is right there (#3)', async () => {
    const m = mount(ONE, { review: 'always' });
    m.el.addEventListener('clarify:submit', (e) => e.preventDefault());
    await userEvent.click(row(m, 'y'));
    await onStep(m, 'Check your answers');
    await expect.poll(() => focused(m)?.dataset.act).toBe('send');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => m.el.state).toBe('submitting');
    await new Promise((r) => setTimeout(r, 100)); // a few frames: past the browser's focus fix-up
    expect(focused(m)?.getAttribute('aria-disabled')).toBe('true');
    m.el.setError('');
    await expect.poll(() => focused(m)?.textContent).toBe('Try again');
  });

  it('a long question opens at its start, not scrolled to the options (#7)', async () => {
    const long = 'Before we migrate the reporting pipeline, how should we handle the switch for every team and every dashboard '.repeat(4);
    const m = mount({ id: 'l', questions: [{ ...HOTEL.questions[0]!, prompt: long }] }, { style: '--clarify-max-height: 300px' });
    await expect.poll(() => m.root.querySelector('.card')?.hasAttribute('data-tall')).toBe(true);
    await expect.poll(() => focused(m)?.dataset.opt).toBeTruthy();
    expect(m.root.querySelector('.scroll')!.scrollTop).toBe(0);
  });
});

describe('recovery stays visible', () => {
  it('a card with no review step shows the failure and Try again (#4)', async () => {
    const m = mount(ONE, { review: 'never' });
    m.el.addEventListener('clarify:submit', (e) => e.preventDefault());
    await userEvent.click(row(m, 'y'));
    await expect.poll(() => m.el.state).toBe('submitting');
    m.el.setError('');
    await expect.poll(() => m.root.querySelector<HTMLElement>('.banner')?.hidden).toBe(false);
    expect(m.root.querySelector('.banner')!.textContent).toContain('Couldn’t send your answers');
    expect(button(m, 'retry').textContent).toBe('Try again');
  });

  it('skipping into a text question keeps its Undo toast (#5)', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget per night?');
    await userEvent.click(row(m, 'mid'));
    await onStep(m, 'What matters most?');
    await userEvent.click(button(m, 'skip'));
    await onStep(m, 'Anything else?');
    await new Promise((r) => setTimeout(r, 100)); // past the textarea's focus
    expect(m.root.querySelector('.toast')).not.toBeNull();
    await userEvent.click(button(m, 'undo'));
    await onStep(m, 'What matters most?');
  });

  it('the toast wraps rather than clipping Undo at a 296px card (#6)', async () => {
    const long = { ...HOTEL, questions: [{ ...HOTEL.questions[0]!, label: 'Neighbourhood and transport' }, ...HOTEL.questions.slice(1)] };
    const m = mount(long, { style: 'inline-size: 296px' });
    await expect.poll(() => focused(m)?.dataset.opt).toBe('southbank');
    await userEvent.click(button(m, 'skip'));
    await onStep(m, 'Budget per night?');
    const toast = m.root.querySelector('.toast')!.getBoundingClientRect();
    const undo = m.root.querySelector('.toast .btn')!.getBoundingClientRect();
    const msg = m.root.querySelector<HTMLElement>('.toast .msg')!;
    const card = m.root.querySelector('.card')!.getBoundingClientRect();
    expect(toast.right).toBeLessThanOrEqual(card.right); // the toast stays inside the card
    expect(undo.right).toBeLessThanOrEqual(toast.right); // Undo stays inside the toast
    expect(msg.scrollWidth).toBeLessThanOrEqual(msg.clientWidth); // and nothing is cut
  });

  it('record answers wrap; nothing is left behind a hover-only tooltip (#10)', async () => {
    const m = mount(ONE, { review: 'never' });
    await userEvent.click(row(m, 'y'));
    await expect.poll(() => m.el.state).toBe('answered');
    const dd = m.root.querySelector<HTMLElement>('.record dd')!;
    expect(dd.hasAttribute('title')).toBe(false);
    expect(getComputedStyle(dd).whiteSpace).toBe('normal');
  });
});

describe('errors say what fixes them', () => {
  const REQ: Questionnaire = {
    id: 'req',
    flow: 'all',
    questions: [
      { id: 'name', label: 'Name', prompt: 'What should I call it?', type: 'text', required: true },
      { id: 'tags', label: 'Tags', prompt: 'Pick at least two tags', type: 'multi', min: 2, options: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }, { id: 'c', label: 'Gamma' }] },
      { id: 'opt', label: 'Colour', prompt: 'Any colour?', type: 'single', options: [{ id: 'r', label: 'Red' }, { id: 'g', label: 'Green' }] },
    ],
  };

  it('a blocked Send says how to fix each question and moves focus to the first (#9, #11)', async () => {
    const m = mount(REQ);
    const optional = m.root.querySelectorAll<HTMLElement>('.chips')[1]!;
    expect(optional.hasAttribute('aria-describedby')).toBe(false); // never described by an unseen error
    await userEvent.click(row(m, 'a'));
    await userEvent.click(row(m, 'r')); // Send needs one answered question before it can try
    await userEvent.click(button(m, 'send'));
    const errors = [...m.root.querySelectorAll<HTMLElement>('.q-err:not([hidden])')].map((e) => e.textContent);
    expect(errors).toEqual(['Answer this to send', 'Pick at least 2']);
    const area = m.root.querySelector('textarea')!;
    expect(focused(m)).toBe(area);
    expect(area.getAttribute('aria-invalid')).toBe('true');
    expect(area.getAttribute('aria-describedby')).toBe(m.root.querySelector('.q-err')!.id);
  });

  it('below a minimum, the step footer says what unlocks Continue (#9)', async () => {
    const m = mount(MULTI9);
    await userEvent.click(row(m, 'thai'));
    expect(m.root.querySelector('.foot-l .count')?.textContent).toBe('Pick at least 2');
    await userEvent.click(row(m, 'greek'));
    expect(m.root.querySelector('.foot-l .count.need')).toBeNull();
  });

  it('an invalid text field gets the danger edge, not a fainter one (#15)', async () => {
    const m = mount(REQ);
    await userEvent.click(row(m, 'r'));
    await userEvent.click(button(m, 'send'));
    expect(getComputedStyle(m.root.querySelector('textarea')!).boxShadow).toContain('rgb(194, 65, 12)');
  });
});

describe('controls keep their promises', () => {
  it('a ticked "Something else" checkbox unticks, and keeps its text (#12)', async () => {
    const m = mount(MULTI9);
    const other = row(m, '__other');
    await userEvent.click(other);
    await userEvent.keyboard('Burmese');
    // Once ticked, the label area is the text field (round 14); the checkbox is where it unticks.
    await userEvent.click(other.querySelector('.key')!);
    expect(other.getAttribute('aria-checked')).toBe('false');
    await userEvent.click(other);
    expect(other.getAttribute('aria-checked')).toBe('true');
    expect(m.root.querySelector<HTMLInputElement>('.other-field input')!.value).toBe('Burmese');
  });

  it('the Recommended badge sits on an opaque fill, so a selected row cannot thin it out (#8)', async () => {
    const m = mount(HOTEL, { theme: 'light' });
    await userEvent.click(row(m, 'southbank'));
    const bg = getComputedStyle(row(m, 'southbank').querySelector('.badge')!).backgroundColor;
    expect(bg).not.toMatch(/rgba|\/\s*0?\.\d/);
  });

  it('app text is isolated, so a Latin label keeps its order in an Arabic card (#13)', async () => {
    const m = mount({ id: 'b', questions: [{ id: 'l', label: 'Lang', prompt: 'أي لغة؟', type: 'single', options: [{ id: 'c', label: 'C++' }] }] }, { dir: 'rtl' });
    expect(row(m, 'c').querySelector('.label > bdi')?.textContent).toBe('C++');
    expect(plain(title(m))).toBe('أي لغة؟');
  });
});
