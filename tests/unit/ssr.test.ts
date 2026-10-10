import { describe, expect, it } from 'vitest';

// Astro, Next and other server renderers import components on the server, where there is no
// HTMLElement, document or customElements. Importing must not crash there (BUILD §12).
describe('server-side import', () => {
  it('imports in Node without a DOM, and exposes the API', async () => {
    expect(typeof (globalThis as { HTMLElement?: unknown }).HTMLElement).toBe('undefined');
    const mod = await import('../../src/index');
    expect(typeof mod.AgentClarifier).toBe('function');
    expect(typeof mod.ask).toBe('function');
  });
});
