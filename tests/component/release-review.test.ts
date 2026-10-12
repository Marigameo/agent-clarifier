import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { AgentClarifier, ask } from '../../src/index';
import type { Questionnaire } from '../../src/index';
import { leave } from '../../src/view/motion';
import { HOTEL, button, focused, mount, onStep, row } from './helpers';

// Round 23 (process/23-release/review.md): the pre-release review. One test per finding that a
// browser can show; each failed before its fix.

const ONE: Questionnaire = {
  id: 'one',
  questions: [{ id: 'a', prompt: 'Pick one', type: 'single', options: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }] }],
};
const MAX2: Questionnaire = {
  id: 'm2',
  questions: [{ id: 'm', prompt: 'What matters most?', type: 'multi', max: 2, options: [{ id: 'a', label: 'Walkable' }, { id: 'b', label: 'Quiet' }, { id: 'c', label: 'Gym' }] }],
};

function page() {
  document.body.innerHTML = '<div id="msgs"></div><div id="slot"></div><form id="f"><textarea id="box"></textarea></form>';
  document.querySelector('#f')!.addEventListener('submit', (e) => e.preventDefault());
  return { msgs: document.querySelector('#msgs')!, slot: document.querySelector('#slot')!, box: document.querySelector<HTMLTextAreaElement>('#box')! };
}

describe('ask()', () => {
  it('#4 rejects, instead of waiting forever, when nothing in the questionnaire can be shown', async () => {
    const { slot } = page();
    await expect(ask({ id: 'e', questions: [] }, { container: slot })).rejects.toThrow(/agent-clarifier/);
    // The element is free again: the next ask works.
    const next = ask(ONE, { element: slot.querySelector('agent-clarifier')! });
    slot.querySelector('agent-clarifier')!.expire();
    expect((await next).status).toBe('dismissed');
  });

  it('#23 a card the user reopened ("Edit answers") gives way to a newer ask', async () => {
    const { slot } = page();
    const el = document.createElement('agent-clarifier');
    slot.append(el);
    const first = ask(ONE, { element: el });
    await userEvent.click(el.shadowRoot!.querySelector<HTMLElement>('[data-opt="x"]')!);
    await first;
    el.shadowRoot!.querySelector<HTMLElement>('[data-act="revise"]')!.click();
    expect(el.state).not.toBe('answered');
    const second = ask({ ...ONE, id: 'two' }, { element: el });
    expect(el.snapshot.q?.id).toBe('two');
    el.expire();
    expect((await second).questionnaireId).toBe('two');
  });

  it('#7 with a transcript, focus follows the card to the composer after a keyboard send', async () => {
    const { msgs, slot, box } = page();
    const done = ask(ONE, { container: slot, transcript: msgs, composer: '#box' });
    const root = slot.querySelector('agent-clarifier')!.shadowRoot!;
    await expect.poll(() => root.activeElement).not.toBeNull();
    await userEvent.keyboard('{Enter}');
    await done;
    await expect.poll(() => document.activeElement).toBe(box);
  });
});

describe('the element', () => {
  it('#6 properties set before the code loads are kept (load on first use)', async () => {
    document.body.innerHTML = '<late-clarifier></late-clarifier>';
    const el = document.querySelector('late-clarifier') as AgentClarifier;
    el.placement = 'dock';
    el.questionnaire = ONE;
    customElements.define('late-clarifier', class extends AgentClarifier {});
    expect(el.state).toBe('answering');
    expect(el.getAttribute('placement')).toBe('dock');
  });

  it('#10 replace mode: a card opened before it is on the page takes focus once it is', async () => {
    document.body.innerHTML = '';
    const el = document.createElement('agent-clarifier');
    el.open(ONE);
    document.body.append(el);
    await expect.poll(() => el.shadowRoot!.activeElement?.getAttribute('data-opt')).toBe('x');
  });

  it('#16 a stream that ends with nothing usable leaves the card hidden, not loading forever', () => {
    const m = mount({ id: 's', questions: [{ prompt: 'First…' }] as never });
    m.el.reset();
    m.el.open({ id: 's', questions: [{ id: 'a', prompt: 'Pick', type: 'single', options: [{ id: 'x', label: 'X' }] }] } as Questionnaire, { partial: true });
    expect(m.el.state).toBe('loading');
    m.el.open({ id: 's', questions: [] });
    expect(m.el.state).toBe('hidden');
    expect(m.events.some((e) => e.name === 'error')).toBe(true);
  });

  it('#12 the pill keeps up while questions stream in behind it', () => {
    const m = mount(ONE);
    m.el.reset();
    m.el.open(ONE, { partial: true });
    m.el.minimise();
    m.el.open({ ...ONE, questions: [...ONE.questions, { id: 'b', prompt: 'Two', type: 'text' }] });
    expect(m.root.querySelector('.pill .t')!.textContent).toContain('2');
    expect(m.root.querySelector('.pill button')!.getAttribute('aria-label')).toContain('2');
  });

  it('#35 the live region is never taken out of the page, so no announcement is lost', async () => {
    const m = mount(HOTEL);
    const liveEl = m.root.querySelector('.live')!;
    const removed: Node[] = [];
    new MutationObserver((rs) => rs.forEach((r) => removed.push(...r.removedNodes))).observe(m.root, { childList: true });
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget');
    expect(removed).not.toContain(liveEl);
  });
});

describe('focus never drops to the page', () => {
  it('#8 Undo on the "Sending in…" countdown', async () => {
    const m = mount(ONE, { 'undo-window': '4000', review: 'always' });
    await userEvent.click(row(m, 'x'));
    await expect.poll(() => m.el.state).toBe('reviewing');
    button(m, 'send').click();
    const undo = m.root.querySelector<HTMLElement>('[data-act="undo-send"]')!;
    undo.focus();
    await userEvent.keyboard('{Enter}');
    expect(m.el.state).toBe('reviewing');
    expect(focused(m)).not.toBeNull();
  });

  it('#11 Ctrl+Z while a progress dash has focus', async () => {
    const m = mount(HOTEL);
    await userEvent.click(row(m, 'covent'));
    await onStep(m, 'Budget');
    await userEvent.click(row(m, 'mid'));
    await onStep(m, 'What matters');
    await userEvent.click(row(m, 'walk'));
    m.root.querySelector<HTMLElement>('.dot[data-step="0"]')!.focus();
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(focused(m)).not.toBeNull();
  });
});

describe('keys', () => {
  it('#9 Safari: the Enter that confirms an IME conversion (keyCode 229) does not move on', async () => {
    const m = mount({ id: 't', questions: [{ id: 'n', prompt: 'Where?', type: 'text' }, { id: 'm', prompt: 'Next', type: 'text' }] });
    const area = m.root.querySelector('textarea')!;
    area.focus();
    await userEvent.keyboard('東京');
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, composed: true, cancelable: true }));
    expect(m.el.snapshot.step).toBe(0);
  });

  it('#33 a held key acts once', async () => {
    const m = mount(HOTEL);
    const r = row(m, 'covent');
    r.focus();
    r.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, composed: true, cancelable: true }));
    expect(m.el.snapshot.drafts.area!.values).toEqual([]);
  });
});

describe('the views', () => {
  it('#13 a pick-limit notice hit again while it fades comes back into view', async () => {
    const m = mount(MAX2);
    for (const id of ['a', 'b', 'c']) await userEvent.click(row(m, id));
    const n = m.root.querySelector<HTMLElement>('.toast')!;
    void leave(n);
    await userEvent.click(row(m, 'c'));
    await new Promise((r) => setTimeout(r, 400));
    expect(m.root.querySelector('.toast')).toBe(n);
    expect(getComputedStyle(n).opacity).toBe('1');
  });

  it('#14 all at once: "Something else" is the growing textarea of BUILD §8.2', () => {
    const m = mount({ ...HOTEL, flow: 'all' });
    expect(m.root.querySelector('[data-q="area"] [data-input="__other"]')!.tagName).toBe('TEXTAREA');
  });

  it('#14 all at once: opening "Something else" focuses its field', async () => {
    const m = mount({ ...HOTEL, flow: 'all' });
    await userEvent.click(m.root.querySelector<HTMLElement>('[data-q="area"] [data-opt="__other"]')!);
    expect(focused(m)?.dataset.input).toBe('__other');
  });
});

describe('the composer', () => {
  const COMPOSE: Questionnaire = {
    id: 'c',
    questions: [{ id: 'a', prompt: 'How?', type: 'single', options: [{ id: 'own', label: 'In my words', compose: 'Here’s what I want: ' }, { id: 'b', label: 'B' }] }],
  };

  it('#22 contenteditable: the sentence goes in front, rich text stays, the caret lands after it', async () => {
    document.body.innerHTML = '<agent-clarifier composer="#ed"></agent-clarifier><div id="ed" contenteditable>hi <b>bold</b></div>';
    const el = document.querySelector('agent-clarifier')!;
    el.open(COMPOSE);
    await userEvent.click(el.shadowRoot!.querySelector<HTMLElement>('[data-opt="own"]')!);
    const ed = document.querySelector('#ed')!;
    expect(ed.innerHTML).toBe('Here’s what I want: hi <b>bold</b>');
    const sel = getSelection()!;
    expect(sel.anchorNode!.textContent).toBe('Here’s what I want: ');
    expect(sel.anchorOffset).toBe('Here’s what I want: '.length);
    // Reopening takes the untouched sentence back out, and the rich text is still there.
    el.reopen();
    expect(ed.innerHTML).toBe('hi <b>bold</b>');
  });

  it('#37 a composer that had no placeholder gets none back', () => {
    const m = mount(ONE);
    m.box.removeAttribute('placeholder');
    m.el.reset();
    m.el.open(ONE);
    m.el.minimise();
    expect(m.box.placeholder).not.toBe('');
    m.el.reopen();
    expect(m.box.hasAttribute('placeholder')).toBe(false);
  });

  it('#36 an old record does not undock the live card that shares its composer', () => {
    const m = mount(ONE, { placement: 'dock' });
    const old = document.createElement('agent-clarifier');
    old.setAttribute('composer', '#box');
    m.el.before(old);
    expect(m.form.hasAttribute('data-clarifier-docked')).toBe(true);
    old.remove();
    expect(m.form.hasAttribute('data-clarifier-docked')).toBe(true);
  });

  it('#38 a bad selector does not throw, and a composer that mounts later is found', async () => {
    document.body.innerHTML = '<agent-clarifier></agent-clarifier>';
    const el = document.querySelector('agent-clarifier')!;
    expect(() => el.setAttribute('composer', '##bad')).not.toThrow();
    el.setAttribute('composer', '#late');
    el.open(ONE);
    document.body.insertAdjacentHTML('beforeend', '<form><textarea id="late"></textarea></form>');
    el.minimise();
    expect(document.querySelector('#late')!.getAttribute('placeholder')).toBe('Or reply in your own words…');
  });
});
