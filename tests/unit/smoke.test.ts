import { describe, expect, it } from 'vitest';
import { VERSION } from '../../src/index';

// Vite reads the field, so a release that bumps package.json but not VERSION (or back) fails here.
const pkg = import.meta.glob<string>('../../package.json', { import: 'version', eager: true });

describe('scaffold', () => {
  it('VERSION matches package.json', () => {
    expect(VERSION).toBe(pkg['../../package.json']);
  });
});
