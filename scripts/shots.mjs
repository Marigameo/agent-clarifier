// Screenshots of playground scenarios, for checking work and for review rounds.
// Usage: node scripts/shots.mjs <outDir> [name=query[|step1|step2…] …]
// Steps: "click:<css in the component>" · "pclick:<css in the page>" · "hover:<css in the component>"
//        · "tap:<css in the component>" (needs touch=1) · "key:<Key>" · "type:<text>" · "wait:<ms>"
// Query: vw=<viewport width> · touch=1 (a touch phone: coarse pointer, no hover)
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const [outDir = 'shots', ...specs] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const server = await createServer({ logLevel: 'silent', server: { port: 0 } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ channel: 'chrome' });

for (const spec of specs) {
  const [name, rest] = spec.split(/=(.*)/s);
  const [query, ...steps] = rest.split('|');
  const width = Number(new URLSearchParams(query).get('vw') ?? 1280);
  const touch = new URLSearchParams(query).get('touch') === '1';
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2, hasTouch: touch, isMobile: touch });
  await page.goto(`${base}demo/?${query}`);
  await page.waitForFunction(() => document.querySelector('agent-clarifier')?.shadowRoot?.childElementCount);
  for (const step of steps) {
    const [kind, arg] = step.split(/:(.*)/s);
    if (kind === 'click') await page.locator(`agent-clarifier >> ${arg}`).first().click();
    if (kind === 'pclick') await page.locator(arg).first().click();
    if (kind === 'hover') await page.locator(`agent-clarifier >> ${arg}`).first().hover();
    if (kind === 'tap') await page.locator(`agent-clarifier >> ${arg}`).first().tap();
    if (kind === 'key') await page.keyboard.press(arg);
    if (kind === 'type') await page.keyboard.type(arg);
    if (kind === 'wait') await page.waitForTimeout(Number(arg));
    await page.waitForTimeout(250);
  }
  const target = width < 900 ? page.locator('.stage') : page.locator('body');
  await target.screenshot({ path: `${outDir}/${name}.png` });
  console.log(`${outDir}/${name}.png`);
  await page.close();
}
await browser.close();
await server.close();
