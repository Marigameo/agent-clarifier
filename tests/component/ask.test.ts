import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { ask } from '../../src/index';
import type { Questionnaire } from '../../src/index';

const ONE: Questionnaire = {
  id: 'one',
  questions: [{ id: 'a', prompt: 'Pick one', type: 'single', options: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }] }],
};

function page() {
  document.body.innerHTML = '<div id="msgs"></div><div id="slot"></div><form id="f"><textarea id="box"></textarea></form>';
  return { msgs: document.querySelector('#msgs')!, slot: document.querySelector('#slot')! };
}
const shadow = () => document.querySelector('agent-clarifier')!.shadowRoot!;

describe('ask()', () => {
  it('resolves with the result when the user answers, and moves the record into the transcript', async () => {
    const { msgs, slot } = page();
    const done = ask(ONE, { container: slot, transcript: msgs, composer: '#box' });
    expect(slot.querySelector('agent-clarifier')).not.toBeNull();
    await userEvent.click(shadow().querySelector<HTMLElement>('[data-opt="y"]')!);
    const result = await done;
    expect(result).toMatchObject({ questionnaireId: 'one', status: 'submitted', answers: { a: { values: ['y'] } } });
    expect(msgs.querySelector('agent-clarifier')!.state).toBe('answered');
    expect(slot.querySelector('agent-clarifier')).toBeNull();
  });

  it('each ask gets its own card when there is a transcript', async () => {
    const { msgs, slot } = page();
    const first = ask(ONE, { container: slot, transcript: msgs });
    await userEvent.click(shadow().querySelector<HTMLElement>('[data-opt="x"]')!);
    await first;
    const second = ask({ ...ONE, id: 'two' }, { container: slot, transcript: msgs });
    expect(document.querySelectorAll('agent-clarifier')).toHaveLength(2);
    slot.querySelector('agent-clarifier')!.expire();
    expect((await second).status).toBe('dismissed');
  });

  it('aborting expires the card and resolves as dismissed', async () => {
    const { slot } = page();
    const ctrl = new AbortController();
    const done = ask(ONE, { container: slot, signal: ctrl.signal });
    ctrl.abort();
    const result = await done;
    expect(result.status).toBe('dismissed');
    expect(slot.querySelector('agent-clarifier')!.state).toBe('expired');
  });

  it('a newer ask on the same element expires the earlier one', async () => {
    const { slot } = page();
    const el = document.createElement('agent-clarifier');
    slot.append(el);
    const first = ask(ONE, { element: el });
    const second = ask({ ...ONE, id: 'two' }, { element: el });
    expect((await first).status).toBe('dismissed');
    el.minimise();
    el.reply('Just pick');
    expect(await second).toMatchObject({ questionnaireId: 'two', delivery: 'composer', message: 'Just pick' });
  });

  it('resolves even if another listener prevented the submit, and marks the card answered', async () => {
    const { slot } = page();
    const done = ask(ONE, { container: slot });
    const el = slot.querySelector('agent-clarifier')!;
    el.addEventListener('clarify:submit', (e) => e.preventDefault());
    await userEvent.click(shadow().querySelector<HTMLElement>('[data-opt="x"]')!);
    expect((await done).status).toBe('submitted');
    await expect.poll(() => el.state).toBe('answered');
  });

  it('needs a container when there is no element to use', () => {
    document.body.innerHTML = '';
    expect(() => ask(ONE)).toThrow(/container/);
  });
});
