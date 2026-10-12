import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        // The model and labels: pure functions, run in Node in milliseconds.
        extends: true,
        // CSS is let through: by default Vitest swaps CSS for an empty string, which had left the
        // stylesheet checks in styles.test.ts passing on nothing since M2 (found in round 22).
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node', css: { include: [/src\/styles\.css/] } },
      },
      {
        // The element: real Chrome, so focus, keyboard and Shadow DOM behave as they do for users.
        // Uses the Chrome installed on the machine (no browser download).
        extends: true,
        test: {
          name: 'component',
          include: ['tests/component/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions: { channel: 'chrome' } }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/model/**', 'src/labels.ts', 'src/adapters/**'],
      reporter: ['text', 'html'],
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
    },
  },
});
