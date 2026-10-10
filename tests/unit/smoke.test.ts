import { describe, expect, it } from 'vitest';
import { VERSION } from '../../src/index';

describe('scaffold', () => {
  it('builds and tests', () => {
    expect(VERSION).toBe('0.0.0');
  });
});
