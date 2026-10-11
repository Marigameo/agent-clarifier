import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { Questionnaire } from '../../src/index';
import { HOTEL, button, mount, row } from './helpers';

// Round 13: what the `break` stress page (demo/break.html) showed breaking under worst-case content.

const LONG = 'Donaudampfschiffahrtsgesellschaftskapitänsmützenabzeichen';

describe('worst-case content (round 13)', () => {
  it('a long unbreakable question label cannot squeeze the answer out of the record', async () => {
    const q: Questionnaire = { id: 'r', flow: 'all', questions: [{ id: 'a', label: LONG, prompt: 'Pick', type: 'single', options: [{ id: 'x', label: 'A perfectly ordinary answer' }, { id: 'y', label: 'No' }] }] };
    const m = mount(q, { style: 'inline-size: 296px' });
    await userEvent.click(row(m, 'x'));
    await userEvent.click(button(m, 'send'));
    await expect.poll(() => m.el.state).toBe('answered');
    const record = m.root.querySelector('.record')!.getBoundingClientRect();
    const dd = m.root.querySelector('.record dd')!.getBoundingClientRect();
    expect(dd.width).toBeGreaterThan(100); // not one character per line
    expect(dd.right).toBeLessThanOrEqual(record.right);
  });

  it('a flex sibling cannot squeeze the card to nothing', () => {
    document.body.replaceChildren();
    document.body.insertAdjacentHTML('beforeend', '<div style="display:flex;inline-size:760px"><div style="flex:none;inline-size:600px"></div><agent-clarifier></agent-clarifier></div>');
    const el = document.querySelector('agent-clarifier')!;
    el.open(HOTEL);
    expect(el.getBoundingClientRect().width).toBeGreaterThanOrEqual(280);
  });

  it('built-in labels take their own direction on a right-to-left page ("1 of 4", not "of 1 4")', () => {
    const m = mount({ ...HOTEL, source: 'Acme Bot' }, { dir: 'rtl' });
    expect(getComputedStyle(m.root.querySelector('.step')!).unicodeBidi).toBe('plaintext');
    expect(getComputedStyle(m.root.querySelector('.source .t')!).unicodeBidi).toBe('plaintext');
  });

  it('a disabled card looks disabled', async () => {
    const m = mount(HOTEL, { disabled: '' });
    const card = m.root.querySelector<HTMLElement>('.card')!;
    await Promise.all(card.getAnimations({ subtree: true }).map((a) => a.finished)); // past the opening fade
    expect(Number(getComputedStyle(card).opacity)).toBeLessThan(1);
  });

  it('the source dot keeps its size when a long source wraps', () => {
    const m = mount({ ...HOTEL, source: `${LONG} ${LONG} ${LONG}` }, { style: 'inline-size: 320px' });
    expect(getComputedStyle(m.root.querySelector('.source')!, '::before').flexShrink).toBe('0');
  });
});
