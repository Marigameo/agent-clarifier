// Put screenshots side by side in one image, for review rounds.
// Usage: node scripts/sheet.mjs <out.png> <img…>   (images are scaled to the same height)
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [out, ...imgs] = process.argv.slice(2);
const H = 820;
const tags = imgs
  .map((f) => `<img src="data:image/png;base64,${readFileSync(resolve(f)).toString('base64')}" style="height:${H}px">`)
  .join('');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 4000, height: H } });
await page.setContent(`<body style="margin:0;display:inline-flex;gap:8px;background:#d8d8d8">${tags}</body>`);
await page.waitForTimeout(200);
await page.locator('body').screenshot({ path: out });
await browser.close();
console.log(out);
